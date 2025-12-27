
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Common/Button';
import { getActiveKey } from '../services/apiConfig';
import { dataService } from '../services/dataServiceFactory';

declare const Cesium: any;

// Constants defined outside component to avoid re-renders
const DESTINATIONS: Record<string, { coords: number[], heading: number, pitch: number }> = {
  'West': { coords: [-102.5, 31.5, 150000.0], heading: 15, pitch: -25 },
  'Houston': { coords: [-95.36, 29.76, 80000.0], heading: -10, pitch: -30 },
  'DFW': { coords: [-97.33, 32.75, 100000.0], heading: 20, pitch: -25 },
  'Austin': { coords: [-97.74, 30.27, 80000.0], heading: 0, pitch: -30 },
  'Nuclear': { coords: [-96.5, 28.7, 50000.0], heading: 45, pitch: -20 },
  'Solar': { coords: [-104.0, 31.0, 50000.0], heading: 30, pitch: -25 },
  'DataCenters': { coords: [-97.0, 32.55, 60000.0], heading: 0, pitch: -35 }, // Google/Meta hyperscale cluster
  'Overview': { coords: [-99.0, 30.5, 1200000.0], heading: 25, pitch: -35 }
};

const REGION_BOUNDS: Record<string, number[][]> = {
  'West / Panhandle': [[-103.0, 36.5], [-100.0, 36.5], [-100.0, 31.0], [-106.0, 31.0]],
  'North (DFW)': [[-100.0, 34.0], [-94.0, 34.0], [-94.0, 32.0], [-100.0, 32.0]],
  'Central (Austin)': [[-100.0, 32.0], [-96.0, 32.0], [-96.0, 29.0], [-100.0, 29.0]],
  'Coast (Houston)': [[-96.0, 31.0], [-93.5, 31.0], [-93.5, 28.5], [-96.0, 28.5]],
  'South (Valley)': [[-100.0, 29.0], [-97.0, 29.0], [-97.0, 25.5], [-100.0, 25.5]]
};

const COMMERCIAL_ASSETS = [
  // Moved to demoDataService.ts for dynamic fetching
];

const MAP_MODES: Record<string, any> = {
  '3D': 'SCENE3D',
  '2D': 'SCENE2D',
  '2.5D': 'COLUMBUS_VIEW'
};

// Asset visualization config (moved outside component to avoid re-renders)
const ASSET_CONFIG: Record<string, { color: string; label: string; size: number }> = {
  wind: { color: '#00FFFF', label: 'W', size: 14 },
  solar: { color: '#FFD700', label: 'S', size: 12 },
  gas: { color: '#FFA500', label: 'G', size: 16 },
  nuclear: { color: '#FF00FF', label: 'N', size: 18 },
  hydro: { color: '#0000FF', label: 'H', size: 14 },
  coal: { color: '#444444', label: 'C', size: 14 },
  battery: { color: '#00FF00', label: 'B', size: 12 },
  oil: { color: '#444444', label: 'O', size: 12 },
  datacenter: { color: '#00FFFF', label: 'D', size: 20 },
  military: { color: 'rgba(255,0,0,0.4)', label: 'MIL', size: 15 },
  nogo: { color: 'rgba(128,0,128,0.4)', label: 'NG', size: 15 },
  crop: { color: 'rgba(0,100,0,0.3)', label: 'AGRI', size: 15 }
};

export const DigitalTwin: React.FC = () => {
  const [cesiumReady, setCesiumReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isWeatherVisible, setIsWeatherVisible] = useState(true);
  const [isCommercialVisible, setIsCommercialVisible] = useState(false);
  const [isMilitaryVisible, setIsMilitaryVisible] = useState(false);
  const [isAgriVisible, setIsAgriVisible] = useState(false);
  const [isPowerVisible, setIsPowerVisible] = useState(true); // Power plants layer on by default
  const [mapMode, setMapMode] = useState('3D');
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const viewerRef = useRef<any>(null);
  const weatherPolygonsRef = useRef<any[]>([]);
  const satelliteLayerRef = useRef<any>(null);
  const dataSourcesRef = useRef<Record<string, any>>({});
  const selectionRingRef = useRef<any>(null);
  const powerRef = useRef(isPowerVisible);

  // Visibility Refs to fix stale closures in Cesium callbacks
  const commercialRef = useRef(isCommercialVisible);
  const militaryRef = useRef(isMilitaryVisible);
  const agriRef = useRef(isAgriVisible);

  useEffect(() => { commercialRef.current = isCommercialVisible; }, [isCommercialVisible]);
  useEffect(() => { militaryRef.current = isMilitaryVisible; }, [isMilitaryVisible]);
  useEffect(() => { agriRef.current = isAgriVisible; }, [isAgriVisible]);
  useEffect(() => { powerRef.current = isPowerVisible; }, [isPowerVisible]);

  useEffect(() => {
    let mounted = true; // Flag to track if component is still mounted

    const initEngine = async () => {
      // GUARD: Prevent duplicate viewers (React Strict Mode runs effects twice)
      if (viewerRef.current) {
        return;
      }

      // Clear any existing content in the container
      const container = document.getElementById('cesium-viewport');
      if (container) {
        container.innerHTML = '';
      }

      // 1. Polling check for the global script availability
      let attempts = 0;
      while (typeof Cesium === 'undefined' && attempts < 50) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
      }

      if (typeof Cesium === 'undefined') {
        setError("Cesium SDK missing from DOM. Check Network/CDN.");
        return;
      }

      // ABORT if unmounted during Cesium wait
      if (!mounted) return;

      try {
        // 2. FORCE MODULE BASE (Critical for Workers)
        const CDN = 'https://cesium.com/downloads/cesiumjs/releases/1.112/Build/Cesium/';
        Cesium.buildModuleUrl.setBaseUrl(CDN);

        // 3. Configure Ion Token (if available)
        const token = getActiveKey('CESIUM_ION_TOKEN');
        if (token) {
          Cesium.Ion.defaultAccessToken = token;
        }

        // 4. Create Viewer - Use Ion if token exists, otherwise go straight to Esri
        let baseImagery;
        let terrainProvider;

        if (token) {
          // With token: Try Cesium Ion (best quality)
          try {
            baseImagery = await Cesium.createWorldImageryAsync({
              style: Cesium.IonWorldImageryStyle.AERIAL
            });
            terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
          } catch (imageryError) {
            console.warn('[CESIUM] Ion imagery failed, falling back to Esri:', imageryError);
            baseImagery = new Cesium.ArcGisMapServerImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
            });
            terrainProvider = new Cesium.EllipsoidTerrainProvider();
          }
        } else {
          // No token: Go straight to Esri (free, no auth needed)
          console.log('[CESIUM] No Ion token, using Esri World Imagery (free tier)');
          baseImagery = new Cesium.ArcGisMapServerImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
          });
          terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }

        const viewer = new Cesium.Viewer('cesium-viewport', {
          terrainProvider,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          infoBox: false,
          selectionIndicator: false,
          fullscreenButton: false,
          creditContainer: document.createElement("div"),
          baseLayer: new Cesium.ImageryLayer(baseImagery),
          // Enhanced rendering
          shadows: false,
          terrainShadows: Cesium.ShadowMode.DISABLED,
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity
        });

        // Ensure zoom/rotate/tilt are enabled
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;


        // TIER 3: CONTEXT LABELS (CartoDB - Dark Mode)
        // White text labels to contrast against the dark satellite map.
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c', 'd'],
            credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
          })
        );

        // Initial configuration - BRIGHT satellite view, no dark/space effects
        viewer.scene.globe.enableLighting = false; // No day/night cycle
        viewer.scene.globe.showGroundAtmosphere = false; // No blue glow
        viewer.scene.globe.baseColor = Cesium.Color.DARKSLATEGRAY; // Fallback color

        viewer.scene.highDynamicRange = true;
        viewer.scene.postProcessStages.fxaa.enabled = true;
        // NOTE: clock.shouldAnimate must remain TRUE for flyTo animations to work

        // High Noon for maximum visibility
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2024-06-21T18:00:00Z");

        // Standard Atmosphere
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0001;
        viewer.scene.fog.minimumBrightness = 0.05;
        viewer.scene.skyAtmosphere.brightnessShift = 0.0;
        viewer.scene.skyAtmosphere.saturationShift = 0.0;
        viewer.scene.globe.atmosphereLightIntensity = 20.0;
        viewer.scene.globe.atmosphereBrightnessShift = 0.0;

        // =========================================
        // PHASE 2: GRID INFRASTRUCTURE
        // =========================================

        // Major transmission corridors (approximate ERCOT routes)
        const corridors = [
          {
            name: "West-North Corridor",
            coords: [-102.5, 31.5, -100.5, 32.8, -97.3, 32.9], // Permian → Midland → DFW
            load: 0.92, // 92% capacity
            color: Cesium.Color.YELLOW.withAlpha(0.8)
          },
          {
            name: "North-Houston Corridor",
            coords: [-97.3, 32.9, -96.5, 31.3, -95.4, 29.7], // DFW → Waco → Houston
            load: 0.65,
            color: Cesium.Color.LIME.withAlpha(0.8)
          },
          {
            name: "Coast-Valley Corridor",
            coords: [-95.4, 29.7, -97.2, 27.8, -97.5, 26.2], // Houston → Corpus → Valley
            load: 0.45,
            color: Cesium.Color.CYAN.withAlpha(0.8)
          },
          {
            name: "Austin-Houston Link",
            coords: [-97.7, 30.3, -96.5, 29.9, -95.4, 29.7], // Austin → Bastrop → Houston
            load: 0.78,
            color: Cesium.Color.SPRINGGREEN.withAlpha(0.8)
          },
          {
            name: "Pan-North Corridor",
            coords: [-101.8, 35.2, -100.0, 34.5, -97.3, 32.9], // Amarillo → Lubbock → DFW
            load: 0.55,
            color: Cesium.Color.LIME.withAlpha(0.8)
          }
        ];

        // Create glowing transmission lines with animated power flow
        const flowEntities: any[] = [];

        corridors.forEach((corridor, corridorIdx) => {
          const positions = [];
          for (let i = 0; i < corridor.coords.length; i += 2) {
            positions.push(Cesium.Cartesian3.fromDegrees(corridor.coords[i], corridor.coords[i + 1], 1000));
          }

          // Main static line
          viewer.entities.add({
            polyline: {
              positions: positions,
              width: corridor.load > 0.85 ? 6 : corridor.load > 0.6 ? 4 : 3,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                taperPower: 0.5,
                color: corridor.load > 0.85 ? Cesium.Color.ORANGERED :
                  corridor.load > 0.6 ? Cesium.Color.YELLOW : Cesium.Color.LIME
              }),
              clampToGround: false
            }
          });

          // Create animated flow particles for this corridor
          const numParticles = 3;
          const flowColor = corridor.load > 0.85 ? Cesium.Color.RED.withAlpha(0.9) :
            corridor.load > 0.6 ? Cesium.Color.ORANGE.withAlpha(0.9) : Cesium.Color.CYAN.withAlpha(0.9);

          for (let p = 0; p < numParticles; p++) {
            const particle = viewer.entities.add({
              position: positions[0],
              point: {
                pixelSize: corridor.load > 0.85 ? 10 : 7,
                color: flowColor,
                outlineWidth: 1,
                outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            });

            flowEntities.push({
              entity: particle,
              positions: positions,
              offset: p / numParticles, // Stagger particles
              speed: 0.5 + corridor.load * 0.5, // Faster when more loaded
              progress: p / numParticles
            });
          }
        });

        // Animation loop for power flow
        let animationFrame: number;
        const animateFlow = () => {
          flowEntities.forEach(flow => {
            flow.progress += 0.008 * flow.speed;
            if (flow.progress >= 1) flow.progress = 0;

            // Interpolate position along the corridor
            const totalSegments = flow.positions.length - 1;
            const segmentProgress = flow.progress * totalSegments;
            const segmentIndex = Math.floor(segmentProgress);
            const t = segmentProgress - segmentIndex;

            if (segmentIndex < totalSegments) {
              const start = flow.positions[segmentIndex];
              const end = flow.positions[segmentIndex + 1];

              // Linear interpolation between segment points
              const interpolated = new Cesium.Cartesian3(
                start.x + (end.x - start.x) * t,
                start.y + (end.y - start.y) * t,
                start.z + (end.z - start.z) * t
              );

              flow.entity.position = interpolated;
            }
          });

          animationFrame = requestAnimationFrame(animateFlow);
        };

        // Start animation
        animateFlow();

        // PURGED: Static powerAssets array removed - now loaded dynamically via getGridNodes()

        // Robust Layer Management (DataSources)
        const initDataSources = () => {
          dataSourcesRef.current.commercial = new Cesium.CustomDataSource('commercial');
          dataSourcesRef.current.military = new Cesium.CustomDataSource('military');
          dataSourcesRef.current.agri = new Cesium.CustomDataSource('agri');
          dataSourcesRef.current.power = new Cesium.CustomDataSource('power');

          viewer.dataSources.add(dataSourcesRef.current.commercial);
          viewer.dataSources.add(dataSourcesRef.current.military);
          viewer.dataSources.add(dataSourcesRef.current.agri);
          viewer.dataSources.add(dataSourcesRef.current.power);
        };
        initDataSources();

        const updateDynamicLayers = async () => {
          const ds = dataSourcesRef.current;
          if (!ds.commercial || !ds.military || !ds.agri || !ds.power) return;

          // Clear existing
          ds.commercial.entities.removeAll();
          ds.military.entities.removeAll();
          ds.agri.entities.removeAll();
          ds.power.entities.removeAll();

          // =====================================================
          // POWER ASSETS - Dynamic from API (formerly hardcoded)
          // =====================================================
          if (powerRef.current) {
            const powerAssets = await dataService.getGridNodes();
            // HONEST EMPTY STATE: If API returns 0 nodes, map is empty (no fallback)
            powerAssets.forEach(asset => {
              let entityOpts: any = {
                name: asset.name,
                description: `${asset.desc}\n\nCapacity: ${asset.capacity}\nStatus: ${asset.status.toUpperCase()}`,
              };

              // 3D Geometric Primitives based on asset type
              if (asset.type === 'wind') {
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 60);
                entityOpts.cylinder = {
                  length: 120,
                  topRadius: 2,
                  bottomRadius: 4,
                  material: Cesium.Color.WHITE,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              } else if (asset.type === 'solar') {
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 2);
                entityOpts.box = {
                  dimensions: new Cesium.Cartesian3(300.0, 300.0, 5.0),
                  material: Cesium.Color.BLUE.withAlpha(0.6),
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              } else if (asset.type === 'nuclear') {
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 80);
                entityOpts.cylinder = {
                  length: 160,
                  topRadius: 30,
                  bottomRadius: 60,
                  material: Cesium.Color.LIGHTGRAY,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              } else if (asset.type === 'hydro') {
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 30);
                entityOpts.box = {
                  dimensions: new Cesium.Cartesian3(200.0, 80.0, 60.0),
                  material: Cesium.Color.BLUE,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              } else if (asset.type === 'battery') {
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 15);
                entityOpts.box = {
                  dimensions: new Cesium.Cartesian3(80.0, 80.0, 30.0),
                  material: Cesium.Color.GREEN,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              } else {
                // Gas/Coal/Thermal: Industrial Block
                entityOpts.position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 25);
                entityOpts.box = {
                  dimensions: new Cesium.Cartesian3(120.0, 100.0, 50.0),
                  material: Cesium.Color.ORANGE,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };
              }

              ds.power.entities.add(entityOpts);
            });
          }

          // =====================================================
          // COMMERCIAL ASSETS
          // =====================================================
          if (commercialRef.current) {
            const assets = await dataService.getCommercialOpportunities();
            assets.forEach(asset => {
              ds.commercial.entities.add({
                name: asset.name,
                description: asset.desc,
                position: Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, asset.type === 'datacenter' ? 20 : 50),
                box: asset.type === 'datacenter' ? {
                  dimensions: new Cesium.Cartesian3(400.0, 300.0, 40.0),
                  material: Cesium.Color.CYAN.withAlpha(0.9),
                  outline: true,
                  outlineColor: Cesium.Color.WHITE,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                } : undefined,
                cylinder: asset.type === 'oil' ? {
                  length: 100,
                  topRadius: 2,
                  bottomRadius: 8,
                  material: Cesium.Color.DARKSLATEGRAY,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                } : undefined,
                label: {
                  text: asset.type === 'datacenter' ? "AI DATA CENTER" : "OIL RIG",
                  font: "bold 12px Inter, sans-serif",
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 2,
                  showBackground: true,
                  backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                  pixelOffset: new Cesium.Cartesian2(0, -60),
                  distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 800000)
                }
              });
            });
          }

          // =====================================================
          // MILITARY/RESTRICTED ZONES
          // =====================================================
          if (militaryRef.current) {
            const zones = await dataService.getRestrictedZones();
            zones.forEach(zone => {
              ds.military.entities.add({
                name: zone.name,
                description: zone.desc,
                polygon: {
                  hierarchy: Cesium.Cartesian3.fromDegreesArray(zone.bounds.flat()),
                  material: Cesium.Color.RED.withAlpha(0.4),
                  outline: true,
                  outlineColor: Cesium.Color.RED,
                  height: 200,
                  extrudedHeight: 400
                }
              });
            });
          }

          // =====================================================
          // AGRICULTURAL DATA
          // =====================================================
          if (agriRef.current) {
            const agriData = await dataService.getAgriculturalData();
            agriData.forEach(item => {
              ds.agri.entities.add({
                name: item.name,
                description: item.desc,
                polygon: {
                  hierarchy: Cesium.Cartesian3.fromDegreesArray(item.bounds.flat()),
                  material: Cesium.Color.DARKGREEN.withAlpha(0.3),
                  outline: true,
                  outlineColor: Cesium.Color.GREEN.withAlpha(0.5),
                  height: 50,
                  extrudedHeight: 100
                }
              });
            });
          }
        };

        // Initial load of dynamic layers (including power assets)
        updateDynamicLayers();

        (viewer as any)._updateDynamicLayers = updateDynamicLayers;

        // =========================================
        // PHASE 3: NASA WILDFIRES & WEATHER
        // =========================================
        const loadExternalLayers = async () => {
          try {
            const [fires, stats] = await Promise.all([
              dataService.getActiveWildfires(),
              dataService.getRegionalStatus()
            ]);

            // Load Wildfires
            fires.forEach((fire, idx) => {
              if (!viewer.entities) return;
              viewer.entities.add({
                name: `NASA Hotspot ${idx + 1}`,
                description: `Sensed via NASA FIRMS. Brightness: ${fire.brightness}K. Confidence: ${fire.confidence.toUpperCase()}.`,
                position: Cesium.Cartesian3.fromDegrees(fire.lon, fire.lat, 1000),
                point: {
                  pixelSize: 12,
                  color: fire.confidence === 'high' ? Cesium.Color.RED : Cesium.Color.ORANGE,
                  outlineWidth: 2,
                  outlineColor: Cesium.Color.YELLOW,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY
                }
              });
            });

            // Load Weather Polygons
            if (stats) {
              stats.forEach((regionData: any) => {
                const boundary = REGION_BOUNDS[regionData.region];
                if (!boundary) return;
                const temp = regionData.temp || 70;
                const t = Math.min(Math.max((temp - 40) / 60, 0), 1);
                const color = Cesium.Color.fromHsl((1 - t) * 0.6, 0.8, 0.5, 0.15);
                if (!viewer.entities) return;
                const poly = viewer.entities.add({
                  name: `${regionData.region} Weather Layer`,
                  description: `Current Regional Temp: ${temp}F. Conditions: ${regionData.conditions}.`,
                  polygon: {
                    hierarchy: Cesium.Cartesian3.fromDegreesArray(boundary.flat()),
                    material: color,
                    outline: true,
                    outlineColor: color.withAlpha(0.6),
                    height: 100,
                    extrudedHeight: 200
                  },
                  show: true
                });
                weatherPolygonsRef.current.push(poly);
              });
            }
          } catch (e) {
            console.warn('[DIGITAL TWIN] Dynamic layer load failed:', e);
          }
        };
        loadExternalLayers();

        // =========================================
        // PHASE 4: CAMERA & INTERACTION
        // =========================================

        // CRITICAL: Check if still mounted before assigning viewer
        if (!mounted) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;
        if (token) satelliteLayerRef.current = viewer.imageryLayers.get(0);

        // Enable Inputs explicit check
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;

        // Add Texas Border (Simplified GeoJSON)
        const texasBorder = new Cesium.GeoJsonDataSource();
        const texasGeoJson = {
          "type": "Feature",
          "properties": { "name": "Texas Boundary" },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[
              [-106.6456, 31.9025], [-103.0416, 32.0003], [-100.0000, 36.5000], [-99.9999, 36.5004],
              [-94.4300, 33.6400], [-94.0400, 33.5500], [-93.5000, 30.9500], [-93.8400, 29.7000],
              [-97.4000, 26.0400], [-97.1600, 25.9000], [-99.4000, 26.8300], [-100.5000, 28.5000],
              [-103.5000, 29.0000], [-106.5000, 31.8000], [-106.6456, 31.9025]
            ]] // Simplified Approximate Box for visual ref. Real data would be too large for inline.
          }
        };
        // Ideally we fetch a real .geojson, but for "Drawing Lines" this works as a visual anchor.
        texasBorder.load(texasGeoJson, {
          stroke: Cesium.Color.CYAN.withAlpha(0.8),
          strokeWidth: 5,
          fill: Cesium.Color.CYAN.withAlpha(0.05),
          clampToGround: true
        }).then(() => viewer.dataSources.add(texasBorder));

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(DESTINATIONS.Overview.coords[0], DESTINATIONS.Overview.coords[1], 5000000.0),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
        });

        setTimeout(() => {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(...DESTINATIONS.Overview.coords),
            orientation: {
              heading: Cesium.Math.toRadians(DESTINATIONS.Overview.heading),
              pitch: Cesium.Math.toRadians(DESTINATIONS.Overview.pitch),
              roll: 0
            },
            duration: 4.0,
            complete: () => setCesiumReady(true)
          });
        }, 500);

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: any) => {
          const pickedObject = viewer.scene.pick(click.position);

          // Clear previous ring
          if (selectionRingRef.current) {
            viewer.entities.remove(selectionRingRef.current);
            selectionRingRef.current = null;
          }

          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const ent = pickedObject.id;
            setSelectedAsset({
              name: ent.name || "UNIDENTIFIED NODE",
              type: ent.label?.text?.getValue() === "AI DC" ? "datacenter" :
                ent.label?.text?.getValue() === "OIL" ? "oil" :
                  ent.polygon ? (ent.name.includes("Military") ? "military" : ent.name.includes("Agricultural") ? "crop" : "Regional Layer") :
                    ent.point ? "Point Asset" : ent.polyline ? "Corridor" : "Regional Layer",
              description: ent.description ? ent.description.getValue() : "Live telemetry active.",
              id: ent.id,
              raw: ent
            });

            // Add Tactical Range Rings (Multi-tier)
            if (ent.position) {
              const pos = ent.position.getValue(viewer.clock.currentTime);
              const rings = new Cesium.EntityCollection();

              // Internal Ring
              selectionRingRef.current = viewer.entities.add({
                position: pos,
                ellipse: {
                  semiMinorAxis: 15000.0,
                  semiMajorAxis: 15000.0,
                  material: Cesium.Color.CYAN.withAlpha(0.15),
                  outline: true,
                  outlineColor: Cesium.Color.CYAN,
                  outlineWidth: 2,
                  height: 500,
                  stippleEnabled: true
                }
              });

              // Outer Tactical Boundary
              viewer.entities.add({
                parent: selectionRingRef.current,
                position: pos,
                ellipse: {
                  semiMinorAxis: 30000.0,
                  semiMajorAxis: 30000.0,
                  material: Cesium.Color.TRANSPARENT,
                  outline: true,
                  outlineColor: Cesium.Color.CYAN.withAlpha(0.3),
                  outlineWidth: 1,
                  height: 500,
                  stippleEnabled: true
                }
              });
            }

            // Visual feedback
            if (ent.point) {
              const base = ent.point.pixelSize.getValue();
              ent.point.pixelSize = base * 1.5;
              setTimeout(() => { if (ent.point) ent.point.pixelSize = base; }, 1000);
            }
          } else {
            setSelectedAsset(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      } catch (err: any) {
        console.error("Cesium Critical Failure:", err);
        setError(err.message || "Renderer kernel fault.");
      }
    };

    initEngine();

    const handleNavEvent = (e: any) => {
      const loc = e.detail?.destination || e.detail?.location || 'Overview';
      flyTo(loc);
    };
    window.addEventListener('gridguard-navigate-map', handleNavEvent);

    return () => {
      mounted = false; // Signal to abort any in-progress init
      window.removeEventListener('gridguard-navigate-map', handleNavEvent);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Effect to handle dynamic layer visibility reactively
  useEffect(() => {
    const ds = dataSourcesRef.current;
    if (ds.commercial) ds.commercial.show = isCommercialVisible;
    if (ds.military) ds.military.show = isMilitaryVisible;
    if (ds.agri) ds.agri.show = isAgriVisible;

    // If visibility just turned ON and layer is empty, load data
    if (viewerRef.current) {
      const update = (viewerRef.current as any)._updateDynamicLayers;
      if (update) {
        if (isCommercialVisible && ds.commercial?.entities.values.length === 0) update();
        if (isMilitaryVisible && ds.military?.entities.values.length === 0) update();
        if (isAgriVisible && ds.agri?.entities.values.length === 0) update();
      }
    }
  }, [isCommercialVisible, isMilitaryVisible, isAgriVisible]);

  // Effect to handle satellite/map view toggle
  useEffect(() => {
    const swapImagery = async () => {
      const v = viewerRef.current;
      if (!v) return;

      // Remove existing base layer
      if (v.imageryLayers.length > 0) {
        v.imageryLayers.remove(v.imageryLayers.get(0), false);
      }

      if (isSatellite) {
        // Satellite mode: Cesium Ion Bing Aerial
        const satProvider = await Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.AERIAL
        });
        v.imageryLayers.addImageryProvider(satProvider, 0);
      } else {
        // Map mode: OpenStreetMap
        const osmProvider = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/'
        });
        v.imageryLayers.addImageryProvider(osmProvider, 0);
      }
    };
    swapImagery();
  }, [isSatellite]);


  // Effect to handle map mode reactively
  useEffect(() => {
    if (viewerRef.current) {
      const scene = viewerRef.current.scene;
      if (mapMode === '3D') scene.mode = Cesium.SceneMode.SCENE3D;
      else if (mapMode === '2D') scene.mode = Cesium.SceneMode.SCENE2D;
      else if (mapMode === '2.5D') scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;
    }
  }, [mapMode]);

  // Effect to handle terrain reactively
  useEffect(() => {
    const updateTerrain = async () => {
      if (viewerRef.current) {
        if (isTerrainEnabled) {
          const token = getActiveKey('CESIUM_ION_TOKEN');
          viewerRef.current.terrainProvider = token
            ? await Cesium.CesiumTerrainProvider.fromIonAssetId(1)
            : new Cesium.EllipsoidTerrainProvider();
        } else {
          viewerRef.current.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
      }
    };
    updateTerrain();
  }, [isTerrainEnabled]);

  const flyTo = (loc: string) => {
    const v = viewerRef.current;
    if (!v) return;

    const target = DESTINATIONS[loc] || DESTINATIONS['Overview'];

    try {
      const destination = Cesium.Cartesian3.fromDegrees(target.coords[0], target.coords[1], target.coords[2]);

      // Use setView for INSTANT move (no animation) to test if camera responds at all
      v.camera.setView({
        destination: destination,
        orientation: {
          heading: Cesium.Math.toRadians(target.heading),
          pitch: Cesium.Math.toRadians(target.pitch),
          roll: 0
        }
      });
    } catch (e) {
      console.error('[BTN] Camera error:', e);
    }
  };

  const zoomIn = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.camera.zoomIn(v.camera.positionCartographic.height * 0.4);
  };

  const zoomOut = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.camera.zoomOut(v.camera.positionCartographic.height * 0.4);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-3">
      {/* Control Header */}
      <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-default)] shadow-xl z-10">
        <h2 className="font-bold flex items-center gap-2 uppercase tracking-tighter text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span className="text-[var(--text-primary)]">Digital Twin</span>
          <span className="text-[var(--status-info)]">// ERCOT GRID</span>
        </h2>
        <div className="flex gap-1.5 items-center">
          <Button variant="secondary" size="sm" onClick={() => flyTo("Overview")} className="text-[9px] px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 mr-1"></span> OVERVIEW
          </Button>
          <Button
            variant={isCommercialVisible ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsCommercialVisible(!isCommercialVisible)}
            className="font-bold border-l-4 border-l-yellow-500"
          >
            COMMERCIAL {isCommercialVisible ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant={isMilitaryVisible ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsMilitaryVisible(!isMilitaryVisible)}
            className="font-bold border-l-4 border-l-red-500"
          >
            MILITARY {isMilitaryVisible ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant={isAgriVisible ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsAgriVisible(!isAgriVisible)}
            className="font-bold border-l-4 border-l-green-500"
          >
            AGRI {isAgriVisible ? 'ON' : 'OFF'}
          </Button>
          <div className="w-px h-6 bg-[var(--border-default)] mx-1" />
          <Button variant="secondary" size="sm" onClick={() => flyTo("West")} className="text-[9px] px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1"></span> WIND_WEST
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flyTo("Houston")} className="text-[9px] px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1"></span> HOUSTON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flyTo("DFW")} className="text-[9px] px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1"></span> DFW
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setIsCommercialVisible(true); flyTo("DataCenters"); }} className="text-[9px] px-2 border-l-2 border-l-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1"></span> AI_DATACENTERS
          </Button>
          <Button variant="secondary" size="sm" onClick={() => flyTo("Nuclear")} className="text-[9px] px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-1"></span> STP_NUCLEAR
          </Button>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden border border-[var(--border-default)] bg-black shadow-2xl">
        {/* THE GLOBE ELEMENT */}
        <div id="cesium-viewport" />

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 text-red-500 font-mono text-xs p-10 text-center">
            <div className="w-12 h-12 mb-4 border-2 border-red-500 flex items-center justify-center font-bold text-xl">!</div>
            SYSTEM_KERNEL_FAULT: {error}
            <div className="mt-6 text-[var(--text-muted)] text-[10px] max-w-xs leading-relaxed uppercase">
              Verification required: Ensure Cesium Ion Token is valid and CDN is reachable.
            </div>
          </div>
        )}

        {/* Loading Overlay - Enhanced */}
        {!cesiumReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-2 border-[var(--status-info)]/30 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-t-[var(--status-info)] rounded-full animate-spin"></div>
              <div className="absolute inset-2 w-12 h-12 border border-[var(--status-info)]/20 rounded-full"></div>
            </div>
            <div className="text-[var(--status-info)] font-mono text-xs tracking-[0.3em] uppercase animate-pulse">
              Initializing Digital Twin
            </div>
            <div className="text-[var(--text-muted)] font-mono text-[10px] mt-2 tracking-widest">
              LOADING ERCOT GRID TOPOLOGY...
            </div>
          </div>
        )}

        {/* TOP-LEFT: Main Telemetry HUD - Locked to Tactical Style */}
        <div className="absolute top-4 left-4 p-4 backdrop-blur-2xl border rounded-sm font-mono text-[9px] pointer-events-none z-10 min-w-[220px] transition-all duration-500 animate-in slide-in-from-left-4 bg-black/85 border-cyan-500/40 text-white shadow-[0_0_30px_rgba(0,255,255,0.2)]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
              <span className="font-black tracking-[0.3em] uppercase text-[10px] text-cyan-400">GRID RECON HUD</span>
            </div>
            <span className="text-[8px] font-bold text-cyan-500/50">LIVE UPLINK</span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Status</div>
              <div className="text-green-400 font-bold tracking-tighter">OPERATIONAL</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Sync</div>
              <div className="text-cyan-400 font-bold">UPLINK_STABLE</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Frequency</div>
              <div className="text-white font-bold">60.021 HZ</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Load_Factor</div>
              <div className="text-white font-bold">84.2%</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Total_MW</div>
              <div className="text-white font-bold">54,128</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[var(--text-muted)] text-[7px] uppercase tracking-wider">Asset_Count</div>
              <div className="text-cyan-400 font-bold">142 ACTIVE</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1 h-3 bg-cyan-500/20 rounded-sm overflow-hidden relative">
                  <div className="absolute bottom-0 left-0 right-0 bg-cyan-500 animate-pulse" style={{ height: `${20 + i * 15}%` }}></div>
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="text-[var(--text-muted)] text-[6px]">ENCRYPTION</div>
              <div className="text-[7px] text-cyan-500/60 font-mono">AES-256 GCM</div>
            </div>
          </div>
        </div>

        {/* TOP-CENTER: MAP CONTROLS */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full z-10">
          <button
            onClick={() => {
              const newState = !isSatellite;
              setIsSatellite(newState);
              if (viewerRef.current && viewerRef.current.imageryLayers.length > 0) {
                viewerRef.current.imageryLayers.get(0).show = true; // Ensure base is always visible for now
              }
            }}
            className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all ${isSatellite ? 'bg-cyan-500 text-black' : 'text-white hover:bg-white/10'}`}
          >
            {isSatellite ? 'SATELLITE VIEW' : 'MAP VIEW'}
          </button>
          <div className="w-[1px] h-4 bg-white/20"></div>
          <button
            onClick={() => {
              setIsWeatherVisible(!isWeatherVisible);
              weatherPolygonsRef.current.forEach(p => p.show = !isWeatherVisible);
            }}
            className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all ${isWeatherVisible ? 'bg-orange-500 text-black' : 'text-white hover:bg-white/10'}`}
          >
            {isWeatherVisible ? 'WEATHER ON' : 'WEATHER OFF'}
          </button>
          <div className="w-[1px] h-4 bg-white/20"></div>
          <div className="flex bg-black/40 rounded-full p-0.5">
            {['3D', '2D', '2.5D'].map(mode => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                className={`px-2 py-1 rounded-full text-[8px] font-bold transition-all ${mapMode === mode ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="w-[1px] h-4 bg-white/20"></div>
          <button
            onClick={() => setIsTerrainEnabled(!isTerrainEnabled)}
            className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all ${isTerrainEnabled ? 'text-cyan-400' : 'text-white/40'}`}
          >
            TERRAIN {isTerrainEnabled ? 'ON' : 'OFF'}
          </button>
          <div className="w-[1px] h-4 bg-white/20"></div>
          <div className="flex bg-black/40 rounded-full p-0.5">
            <button
              onClick={zoomIn}
              className="px-2 py-1 text-white hover:bg-white/10 rounded-full transition-all"
              title="Zoom In"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button
              onClick={zoomOut}
              className="px-2 py-1 text-white hover:bg-white/10 rounded-full transition-all"
              title="Zoom Out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        {/* TOP-RIGHT: Transmission Legend */}
        <div className="absolute top-4 right-4 p-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-lg font-mono text-[8px] text-white pointer-events-none z-10">
          <div className="text-[var(--text-muted)] font-bold tracking-[0.15em] uppercase mb-2">Corridor Load</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"></div>
              <span>&lt;60% Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"></div>
              <span>60-85% Elevated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
              <span>&gt;85% Critical</span>
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT: Asset Legend */}
        <div className="absolute bottom-4 left-4 p-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-lg font-mono text-[8px] text-white pointer-events-none z-10">
          <div className="text-[var(--text-muted)] font-bold tracking-[0.15em] uppercase mb-2">Generation Assets</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <span>Wind Farm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span>Solar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              <span>Gas/Thermal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-400"></div>
              <span>Nuclear</span>
            </div>
          </div>
        </div>

        {/* BOTTOM-RIGHT: Grid Stats */}
        <div className="absolute bottom-4 right-4 p-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-lg font-mono text-[8px] text-white pointer-events-none z-10">
          <div className="text-[var(--text-muted)] font-bold tracking-[0.15em] uppercase mb-2">Grid Statistics</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="text-[var(--text-muted)]">WIND:</span>
              <span className="text-cyan-400">28.4%</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[var(--text-muted)]">SOLAR:</span>
              <span className="text-yellow-400">12.1%</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[var(--text-muted)]">GAS:</span>
              <span className="text-orange-400">42.3%</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[var(--text-muted)]">NUCLEAR:</span>
              <span className="text-pink-400">9.7%</span>
            </div>
          </div>
        </div>

        {/* SATELLITE TOGGLE OVERLAY */}
        <div className="absolute top-20 right-4 p-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex flex-col gap-1 z-10">
          <button
            onClick={() => flyTo('Overview')}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Reset View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
        </div>

        {/* TACTICAL ENTITY INFO PANEL */}
        {selectedAsset && (
          <div className="absolute top-4 right-4 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xs overflow-hidden shadow-2xl z-20 animate-in slide-in-from-right-8 duration-200 font-sans text-xs flex flex-col max-h-[90vh]">
            {/* Header: AtomEngine Style */}
            <div className="bg-slate-800/80 p-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-700/40 border border-cyan-500/50 rounded-sm flex items-center justify-center p-1">
                  {/* Entity Icon Placeholder */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="cyan" stroke="none"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"></path></svg>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-1">Entity Info</div>
                  <div className="text-white font-bold text-sm tracking-tight leading-none uppercase">{selectedAsset.name}</div>
                  <div className="text-cyan-500 text-[9px] font-mono mt-0.5 opacity-70 italic">ID: {Math.floor(Math.random() * 9000) + 1000}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Metrics Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Tactical Stats Matrix */}
              <div className="p-3 space-y-3">

                {/* Section: Operational Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-slate-800/50 p-1.5 rounded-xs border-l-2 border-cyan-500">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Operational Status</span>
                    <span className="text-white font-bold tracking-tighter text-[10px]">100% ONLINE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-700/30">
                    <div className="bg-slate-900/50 p-2">
                      <div className="text-[8px] text-slate-500 uppercase tracking-tighter">Health</div>
                      <div className="text-white font-bold text-xs">100 / 100</div>
                    </div>
                    <div className="bg-slate-900/50 p-2 text-right">
                      <div className="text-[8px] text-slate-500 uppercase tracking-tighter">Security Tier</div>
                      <div className="text-cyan-400 font-bold text-xs uppercase">{selectedAsset.type === 'military' ? 'LVL_5' : 'STD'}</div>
                    </div>
                  </div>
                </div>

                {/* Section: Performance / Combat Value */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-slate-800/30 p-1 text-slate-500 uppercase text-[8px] font-bold tracking-[0.2em] border-b border-slate-700">
                    <span>Performance Matrix</span>
                    <span className="text-cyan-500">CV: 4.2</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50 px-1">
                      <span className="text-slate-400">Yield Index</span>
                      <span className="text-white font-mono">1/1</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/50 px-1">
                      <span className="text-slate-400">Load Factor</span>
                      <span className="text-white font-mono">0.82</span>
                    </div>
                    <div className="flex justify-between items-center py-1 px-1">
                      <span className="text-slate-400">Uptime</span>
                      <span className="text-cyan-400 font-mono tracking-tighter">99.98%</span>
                    </div>
                  </div>
                </div>

                {/* Section: Strategic BLUF */}
                <div className="bg-slate-800/40 p-3 rounded-xs border border-cyan-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-1.5 h-1.5 bg-cyan-400 transform rotate-45"></span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Tactical Summary</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-light">
                    {selectedAsset.description}
                  </p>
                </div>

                {/* McKinsey Insights: Integrated into Tactical Flow */}
                <div className="bg-cyan-900/20 p-3 border-l-2 border-cyan-500/50">
                  <div className="text-[8px] text-cyan-500/70 font-bold uppercase tracking-widest mb-1.5 underline decoration-cyan-500/30 underline-offset-4">Consulting BLUF</div>
                  <p className="text-[10px] text-white font-medium leading-[1.6]">
                    {selectedAsset.type === 'oil' && "RECOM: Site prioritized for expansion. Geological data suggests high sustained output."}
                    {selectedAsset.type === 'datacenter' && "RECOM: Node identifies as Tier-4 AI training cluster. Grid impact: MODERATE."}
                    {selectedAsset.type === 'military' && "ALERT: Direct proximity to Federal exclusionary zone. Any telemetry uplink requires L2 clearance."}
                    {selectedAsset.type === 'crop' && "RESTRICTION: Active agricultural output. Industrial development blocked by Title 14-B."}
                    {!['oil', 'datacenter', 'military', 'crop'].includes(selectedAsset.type) && "STRATEGY: Asset performing within optimal parameters. Periodic N-1 testing recommended."}
                  </p>
                </div>

              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-3 bg-slate-800/50 border-t border-slate-700 flex gap-2">
              <Button
                variant="primary"
                size="xs"
                fullWidth
                className="bg-cyan-600 hover:bg-cyan-500 text-[10px] font-bold tracking-widest py-2 rounded-xs"
              >
                DEPLOY OPS
              </Button>
              <Button
                variant="secondary"
                size="xs"
                fullWidth
                onClick={() => setSelectedAsset(null)}
                className="bg-slate-700 hover:bg-slate-600 border-none text-[10px] font-bold tracking-widest py-2 rounded-xs"
              >
                STANDBY
              </Button>
            </div>
          </div>
        )}

      </div>
    </div >
  );
};
