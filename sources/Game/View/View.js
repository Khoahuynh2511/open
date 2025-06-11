import Camera from './Camera.js'
import Chunks from './Chunks.js'
import Grass from './Grass.js'
import Noises from './Noises.js'
import Player from './Player.js'
import Renderer from './Renderer.js'
import Sky from './Sky.js'
import Terrains from './Terrains.js'
import Water from './Water.js'
import Cow from './Cow.js'
import Bird from './Bird.js'
import BlackPanther from './BlackPanther.js'
import Deer from './Deer.js'
import Sheep from './Sheep.js'
import Game from '../Game.js'
import TerrainHelper from './TerrainHelper.js'
import Debug from '../Debug/Debug.js'
import RainStorm from './Effects/RainStorm/rainstorm.js'

import * as THREE from 'three'

const MAX_SPAWN_ATTEMPTS_PER_ANIMAL = 20; // Max attempts to find a flat spot

// Default flatness parameters (smaller animals)
const DEFAULT_FLATNESS_CHECK_DISTANCE = 1.5;
const DEFAULT_MAX_ELEVATION_DIFFERENCE = 1.0;

// Cow-specific flatness parameters
const COW_FLATNESS_CHECK_DISTANCE = 3; // Wider check area for cows
const COW_MAX_ELEVATION_DIFFERENCE = 0.8;  // Stricter elevation diff for cows

// Panther-specific flatness parameters (ADDED)
const PANTHER_FLATNESS_CHECK_DISTANCE = 3;
const PANTHER_MAX_ELEVATION_DIFFERENCE = 0.8;

// Deer-specific flatness parameters (ADDED)
const DEER_FLATNESS_CHECK_DISTANCE = 3;
const DEER_MAX_ELEVATION_DIFFERENCE = 0.8;

// Sheep-specific flatness parameters (ADDED)
const SHEEP_FLATNESS_CHECK_DISTANCE = 2.5;
const SHEEP_MAX_ELEVATION_DIFFERENCE = 0.8;

export default class View
{
    static instance

    static getInstance()
    {
        return View.instance
    }

    constructor()
    {
        if(View.instance)
            return View.instance

        View.instance = this
        const game = Game.getInstance()
        const stateTerrains = game.state.terrains

        this.terrainHelper = new TerrainHelper({
            seed: stateTerrains.seed,
            lacunarity: stateTerrains.lacunarity,
            persistence: stateTerrains.persistence,
            maxIterations: stateTerrains.maxIterations,
            baseFrequency: stateTerrains.baseFrequency,
            baseAmplitude: stateTerrains.baseAmplitude,
            power: stateTerrains.power,
            elevationOffset: stateTerrains.elevationOffset,
            iterationsOffsets: stateTerrains.iterationsOffsets
        });

        this.scene = new THREE.Scene()
        this.scene.userData.terrainHelper = this.terrainHelper;
        this.scene.userData.elevationIterations = stateTerrains.maxIterations;
        
        const cowModelVerticalOffset = 0.75; // Adjust this value as needed

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
        
        // Thêm lighting để model GLTF không bị đen
        this.setupLighting()
        
        this.camera = new Camera()
        this.audioListener = new THREE.AudioListener();
        this.camera.instance.add(this.audioListener);

        // Đảm bảo resume audio context khi có tương tác người dùng đầu tiên
        const tryResumeAudio = () => {
            if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume();
            }
        };
        window.addEventListener('pointerdown', tryResumeAudio, { once: true });
        window.addEventListener('keydown', tryResumeAudio, { once: true });

        this.renderer = new Renderer()
        this.noises = new Noises()
        this.sky = new Sky()
        this.water = new Water()
        this.terrains = new Terrains()
        this.chunks = new Chunks()
        this.player = new Player()
        this.grass = new Grass()

        this.enableRain = false
        this.rainEffect = null
        this.setDebugUI()
        if (this.enableRain)
            this.rainEffect = new RainStorm(this.scene, this.camera.instance)

        this.cows = []
        this.birds = []
        this.blackPanthers = []
        this.deers = []
        this.sheeps = []
        const elevationIterations = stateTerrains.maxIterations;

        const playerInitialPositionArray = game.state.player.position.current;
        const playerInitialPos = new THREE.Vector3(playerInitialPositionArray[0], playerInitialPositionArray[1], playerInitialPositionArray[2]);
        
        const spawnOffsetDistance = 15;
        let frontSpawnX = playerInitialPos.x;
        let frontSpawnZ = playerInitialPos.z - spawnOffsetDistance;

        let yCowFront = this.terrainHelper.getElevation(frontSpawnX, frontSpawnZ, elevationIterations);
        const cowFrontPosition = new THREE.Vector3(frontSpawnX, yCowFront, frontSpawnZ);
        console.log(`[View.js] About to create special Cow at`, cowFrontPosition);
        const specialCow = new Cow(this.scene, game.state.time, cowFrontPosition);
        this.cows.push(specialCow);
        console.log(`[View.js] Special Cow created successfully`);

        const birdHeightOffset = 20;
        let yBirdFront = this.terrainHelper.getElevation(frontSpawnX, frontSpawnZ, elevationIterations) + birdHeightOffset;
        const birdFrontPosition = new THREE.Vector3(frontSpawnX, yBirdFront, frontSpawnZ);
        console.log(`[View.js] About to create special Bird at`, birdFrontPosition);
        const specialBird = new Bird(this.scene, game.state.time, birdFrontPosition);
        this.birds.push(specialBird);
        console.log(`[View.js] Special Bird created successfully`);

        const numberOfCows = 2;
        const numberOfBirds = 10;
        const numberOfPanthers = 2;
        const numberOfDeers = 2;
        const numberOfSheeps = 2;
        const spawnRange = 100;
        const pantherModelVerticalOffset = 0.5;
        const deerModelVerticalOffset = 0.5;

        for (let i = 0; i < numberOfCows - 1; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * spawnRange * 2;
                z = (Math.random() - 0.5) * spawnRange * 2;
                if(this.isPositionSuitable(x, z, elevationIterations, COW_FLATNESS_CHECK_DISTANCE, COW_MAX_ELEVATION_DIFFERENCE)) {
                    foundSuitableSpot = true;
                }
                attempts++;
            }
            
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + cowModelVerticalOffset;
            position = new THREE.Vector3(x, y, z);

            if (!foundSuitableSpot) {
                console.warn(`[View.js] Could not find a perfectly flat spot for Cow ${i + 1} after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            console.log(`[View.js] About to create Cow ${i + 1} at`, position);
            const cow = new Cow(this.scene, game.state.time, position);
            this.cows.push(cow);
            console.log(`[View.js] Cow ${i + 1} created successfully`);
        }

        for (let i = 0; i < numberOfBirds -1; i++) {
            const x = (Math.random() - 0.5) * spawnRange * 2;
            const z = (Math.random() - 0.5) * spawnRange * 2;
            const y = this.terrainHelper.getElevation(x, z, elevationIterations) + birdHeightOffset;
            const position = new THREE.Vector3(x, y, z);
            console.log(`[View.js] About to create Bird ${i + 1} at`, position);
            const bird = new Bird(this.scene, game.state.time, position);
            this.birds.push(bird);
            console.log(`[View.js] Bird ${i + 1} created successfully`);
        }

        for (let i = 0; i < numberOfPanthers; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * spawnRange * 2;
                z = (Math.random() - 0.5) * spawnRange * 2;
                if(this.isPositionSuitable(x, z, elevationIterations, PANTHER_FLATNESS_CHECK_DISTANCE, PANTHER_MAX_ELEVATION_DIFFERENCE)) {
                    foundSuitableSpot = true;
                }
                attempts++;
            }
            
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + pantherModelVerticalOffset;
            position = new THREE.Vector3(x, y, z);

            if (!foundSuitableSpot) {
                console.warn(`[View.js] Could not find a suitable spot for Panther ${i + 1} after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const panther = new BlackPanther(this.scene, game.state.time, position);
            this.blackPanthers.push(panther);
        }

        for (let i = 0; i < numberOfDeers; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * spawnRange * 2;
                z = (Math.random() - 0.5) * spawnRange * 2;
                if(this.isPositionSuitable(x, z, elevationIterations, DEER_FLATNESS_CHECK_DISTANCE, DEER_MAX_ELEVATION_DIFFERENCE)) {
                    foundSuitableSpot = true;
                }
                attempts++;
            }
            
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + deerModelVerticalOffset;
            position = new THREE.Vector3(x, y, z);

            if (!foundSuitableSpot) {
                console.warn(`[View.js] Could not find a suitable spot for Deer ${i + 1} after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const deer = new Deer(this.scene, game.state.time, position);
            this.deers.push(deer);
        }

        for (let i = 0; i < numberOfSheeps; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * spawnRange * 2;
                z = (Math.random() - 0.5) * spawnRange * 2;
                if(this.isPositionSuitable(x, z, elevationIterations, SHEEP_FLATNESS_CHECK_DISTANCE, SHEEP_MAX_ELEVATION_DIFFERENCE)) {
                    foundSuitableSpot = true;
                }
                attempts++;
            }
            
            y = this.terrainHelper.getElevation(x, z, elevationIterations);
            position = new THREE.Vector3(x, y, z);

            if (!foundSuitableSpot) {
                console.warn(`[View.js] Could not find a suitable spot for Sheep ${i + 1} after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const sheep = new Sheep(this.scene, game.state.time, position);
            this.sheeps.push(sheep);
        }
    }

    isPositionSuitable(x, z, elevationIterations, flatnessCheckDistance, maxElevationDifference) {
        const centerElevation = this.terrainHelper.getElevation(x, z, elevationIterations);

        const pointsToSample = [
            { dx: flatnessCheckDistance, dz: 0 },
            { dx: -flatnessCheckDistance, dz: 0 },
            { dx: 0, dz: flatnessCheckDistance },
            { dx: 0, dz: -flatnessCheckDistance },
            // Optional: Add diagonal checks if needed
            // { dx: flatnessCheckDistance, dz: flatnessCheckDistance },
            // { dx: -flatnessCheckDistance, dz: -flatnessCheckDistance },
            // { dx: flatnessCheckDistance, dz: -flatnessCheckDistance },
            // { dx: -flatnessCheckDistance, dz: flatnessCheckDistance },
        ];

        for (const point of pointsToSample) {
            const sampleX = x + point.dx;
            const sampleZ = z + point.dz;
            const sampleElevation = this.terrainHelper.getElevation(sampleX, sampleZ, elevationIterations);
            if (Math.abs(sampleElevation - centerElevation) > maxElevationDifference) {
                return false; // Too steep
            }
        }
        return true; // Area is considered flat enough
    }

    setupLighting()
    {
        // Ambient light - ánh sáng môi trường để model không bị đen hoàn toàn
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.6) // Soft white light
        this.scene.add(this.ambientLight)

        // Directional light - mô phỏng ánh mặt trời
        this.directionalLight = new THREE.DirectionalLight('#ffffff', 0.8)
        this.directionalLight.position.set(-0.5, 1, -0.5) // Tương ứng với uSunPosition
        this.directionalLight.target.position.set(0, 0, 0)
        this.scene.add(this.directionalLight)
        this.scene.add(this.directionalLight.target)

        console.log('✨ Lighting system initialized for GLTF models')
    }

    setDebugUI()
    {
        const debug = Debug.getInstance()
        if (!debug.active) return

        const folder = debug.ui.getFolder('environment/weather')
        folder.add(this, 'enableRain')
            .name('Enable Rain')
            .onChange((value) => this.toggleRain(value))
    }

    toggleRain(enabled) {
        this.enableRain = enabled
        if (enabled && !this.rainEffect) {
            this.rainEffect = new RainStorm(this.scene, this.camera.instance)
        } else if (!enabled && this.rainEffect) {
            this.rainEffect.destroy()
            this.rainEffect = null
        }
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
        this.sky.resize()
    }

    update()
    {
        this.sky.update()
        this.water.update()
        this.terrains.update()
        this.chunks.update()
        this.player.update()
        this.grass.update()

        if (this.enableRain && this.rainEffect) this.rainEffect.update()

        for (const cow of this.cows) {
            cow.update();
        }

        for (const bird of this.birds) {
            bird.update();
        }

        for (const panther of this.blackPanthers) {
            panther.update();
        }

        for (const deer of this.deers) {
            deer.update();
        }

        for (const sheep of this.sheeps) {
            sheep.update();
        }

        this.camera.update()
        this.renderer.update()
        
        // Update sound
        if(this.soundManager)
            this.soundManager.update()
        if (this.enableRain && this.rainEffect) this.rainEffect.update()
    }

    destroy()
    {
    }

    setDebug() {
        const animalsFolder = this.debug.ui.getFolder('environment/animals');

        // Spawn Range
        const spawnRangeFolder = animalsFolder.addFolder('spawn range');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'cow', 10, 500, 1).name('Cow');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'bird', 10, 500, 1).name('Bird');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'wolf', 10, 500, 1).name('Wolf');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'stag', 10, 500, 1).name('Stag');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'horse', 10, 500, 1).name('Horse');

        // Number
        const numberFolder = animalsFolder.addFolder('number');
        numberFolder.add(this.animalConfig.number, 'cow', 0, 20, 1).name('Cow');
        numberFolder.add(this.animalConfig.number, 'bird', 0, 50, 1).name('Bird');
        numberFolder.add(this.animalConfig.number, 'wolf', 0, 10, 1).name('Wolf');
        numberFolder.add(this.animalConfig.number, 'stag', 0, 20, 1).name('Stag');
        numberFolder.add(this.animalConfig.number, 'horse', 0, 20, 1).name('Horse');

        // Scale
        const scaleFolder = animalsFolder.addFolder('scale');
        scaleFolder.add(this.animalConfig.scale, 'cow', 0.1, 5, 0.01).name('Cow');
        scaleFolder.add(this.animalConfig.scale, 'bird', 0.1, 5, 0.01).name('Bird');
        scaleFolder.add(this.animalConfig.scale, 'wolf', 0.1, 5, 0.01).name('Wolf');
        scaleFolder.add(this.animalConfig.scale, 'stag', 0.1, 5, 0.01).name('Stag');
        scaleFolder.add(this.animalConfig.scale, 'horse', 0.1, 5, 0.01).name('Horse');

        // Apply button
        animalsFolder.add({ apply: () => this.applyAnimalConfig() }, 'apply').name('Apply');

        // Sound (single toggle for all animals, placed below Apply)
        const soundFolder = animalsFolder.addFolder('sound');
        const soundToggle = { enabled: this.animalConfig.sound.cow };
        soundFolder.add(soundToggle, 'enabled').name('Enable All Sounds').onChange((value) => {
            // Update all sound states
            this.animalConfig.sound.cow = value;
            this.animalConfig.sound.bird = value;
            this.animalConfig.sound.wolf = value;
            this.animalConfig.sound.stag = value;
            this.animalConfig.sound.horse = value;
            // Lưu vào localStorage
            try {
                localStorage.setItem('globalAnimalSound', JSON.stringify(value));
            } catch (e) {}
            // Reload the page
            window.location.reload();
        });
    }

    applyAnimalConfig() {
        // Remove old animals from scene
        for (const cow of this.cows) if (cow.model) this.scene.remove(cow.model);
        for (const bird of this.birds) if (bird.model) this.scene.remove(bird.model);
        for (const panther of this.blackPanthers) if (panther.model) this.scene.remove(panther.model);
        for (const deer of this.deers) if (deer.model) this.scene.remove(deer.model);
        for (const sheep of this.sheeps) if (sheep.model) this.scene.remove(sheep.model);
        this.cows = [];
        this.birds = [];
        this.blackPanthers = [];
        this.deers = [];
        this.sheeps = [];

        // Spawn new animals with config
        this.spawnAnimalsByConfig();

        // Update sound on/off for all animals
        for (const cow of this.cows) {
            if (this.animalConfig.sound.cow) {
                cow.enableSound();
            } else {
                cow.disableSound();
            }
        }
        for (const bird of this.birds) {
            if (this.animalConfig.sound.bird) {
                bird.enableSound();
            } else {
                bird.disableSound();
            }
        }
        for (const wolf of this.blackPanthers) {
            if (this.animalConfig.sound.wolf) {
                wolf.enableSound();
            } else {
                wolf.disableSound();
            }
        }
        for (const stag of this.deers) {
            if (this.animalConfig.sound.stag) {
                stag.enableSound();
            } else {
                stag.disableSound();
            }
        }
        for (const horse of this.sheeps) {
            if (this.animalConfig.sound.horse) {
                horse.enableSound();
            } else {
                horse.disableSound();
            }
        }
    }

    spawnAnimalsByConfig() {
        const elevationIterations = Game.getInstance().state.terrains.maxIterations;
        const time = Game.getInstance().state.time;
        const minDistance = 3;
        // Cows
        for (let i = 0; i < this.animalConfig.number.cow; i++) {
            const range = this.animalConfig.spawnRange.cow;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, COW_FLATNESS_CHECK_DISTANCE, COW_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.cows, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.75;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Cow after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const cow = new Cow(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.cow);
            if (cow.model) cow.model.scale.setScalar(this.animalConfig.scale.cow);
            this.cows.push(cow);
        }
        // Birds (không kiểm tra độ phẳng)
        for (let i = 0; i < this.animalConfig.number.bird; i++) {
            const range = this.animalConfig.spawnRange.bird;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (this.isFarFromOthers(x, z, this.birds, minDistance)) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 40;
            if (!found) {
                console.warn(`[View.js] Could not find a non-overlapping spot for Bird after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const bird = new Bird(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.bird);
            if (bird.model) bird.model.scale.setScalar(this.animalConfig.scale.bird);
            this.birds.push(bird);
        }
        // Wolfs
        for (let i = 0; i < this.animalConfig.number.wolf; i++) {
            const range = this.animalConfig.spawnRange.wolf;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, PANTHER_FLATNESS_CHECK_DISTANCE, PANTHER_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.blackPanthers, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Wolf after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const wolf = new Wolf(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.wolf);
            if (wolf.model) wolf.model.scale.setScalar(this.animalConfig.scale.wolf);
            this.blackPanthers.push(wolf);
        }
        // Stags
        for (let i = 0; i < this.animalConfig.number.stag; i++) {
            const range = this.animalConfig.spawnRange.stag;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, STAG_FLATNESS_CHECK_DISTANCE, STAG_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.deers, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Stag after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const stag = new Stag(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.stag);
            if (stag.model) stag.model.scale.setScalar(this.animalConfig.scale.stag);
            this.deers.push(stag);
        }
        // Horses
        for (let i = 0; i < this.animalConfig.number.horse; i++) {
            const range = this.animalConfig.spawnRange.horse;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, HORSE_FLATNESS_CHECK_DISTANCE, HORSE_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.sheeps, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations);
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Horse after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const horse = new Horse(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.horse);
            if (horse.model) horse.model.scale.setScalar(this.animalConfig.scale.horse);
            this.sheeps.push(horse);
        }
    }
}

// import Camera from './Camera.js'
// import Chunks from './Chunks.js'
// import Grass from './Grass.js'
// import Noises from './Noises.js'
// import Player from './Player.js'
// import Renderer from './Renderer.js'
// import Sky from './Sky.js'
// import Terrains from './Terrains.js'
// import Water from './Water.js'
// import Debug from '@/Debug/Debug.js'

// import * as THREE from 'three'
// import RainStorm from './Effects/RainStorm/rainstorm.js'
// export default class View
// {
//     static instance

//     static getInstance()
//     {
//         return View.instance
//     }

//     constructor()
//     {
//         if(View.instance)
//             return View.instance

//         View.instance = this

//         this.scene = new THREE.Scene()
        
//         this.camera = new Camera()
//         this.renderer = new Renderer()
//         this.noises = new Noises()
//         this.sky = new Sky()
//         this.water = new Water()
//         this.terrains = new Terrains()
//         this.chunks = new Chunks()
//         this.player = new Player()
//         this.grass = new Grass()
//         this.enableRain = false
//         this.rainEffect = null
//         this.setDebugUI()
//         if (this.enableRain) {
//             this.rainEffect = new RainStorm(this.scene, this.camera.instance)
//         }
//     }

//     setDebugUI()
//     {
//         const debug = Debug.getInstance()
//         if (!debug.active) return

//         const folder = debug.ui.getFolder('View/Weather')
//         folder.add(this, 'enableRain')
//             .name('Enable Rain')
//             .onChange((value) => this.toggleRain(value))
//     }

//     toggleRain(enabled) {
//         this.enableRain = enabled
//         if (enabled && !this.rainEffect) {
//             this.rainEffect = new RainStorm(this.scene, this.camera.instance)
//         } else if (!enabled && this.rainEffect) {
//             this.rainEffect.destroy()
//             this.rainEffect = null
//         }
//     }


//     resize()
//     {
//         this.camera.resize()
//         this.renderer.resize()
//         this.sky.resize()
//         this.terrains.resize()
//     }

//     update()
//     {
//         this.sky.update()
//         this.water.update()
//         this.terrains.update()
//         this.chunks.update()
//         this.player.update()
//         this.grass.update()
//         this.camera.update()
//         this.renderer.update()
//         if (this.enableRain && this.rainEffect) this.rainEffect.update()
//     }

//     destroy()
//     {
//     }
// }