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
        
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.noises = new Noises()
        this.sky = new Sky()
        this.water = new Water()
        this.terrains = new Terrains()
        this.chunks = new Chunks()
        this.player = new Player()
        this.grass = new Grass()

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
    }

    destroy()
    {
    }
}