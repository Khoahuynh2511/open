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
import Wolf from './Wolf.js'
import Stag from './Stag.js'
import Horse from './Horse.js'
import Game from '../Game.js'
import TerrainHelper from './TerrainHelper.js'
import Trees from './Trees.js'
import SoundManager from './SoundManager.js'
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

// Stag-specific flatness parameters
const STAG_FLATNESS_CHECK_DISTANCE = 3;
const STAG_MAX_ELEVATION_DIFFERENCE = 0.8;

// Horse-specific flatness parameters  
const HORSE_FLATNESS_CHECK_DISTANCE = 3;
const HORSE_MAX_ELEVATION_DIFFERENCE = 0.8;

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
        this.scene.userData.view = this; // Add reference to view for camera access
        
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

        // Đảm bảo resume audio context và start background music khi có tương tác người dùng đầu tiên
        const tryResumeAudio = () => {
            if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    // Start background music after audio context is resumed
                    if (this.backgroundMusicConfig.enabled && this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                        console.log('[View.js] Starting background music after user interaction');
                        this.playBackgroundMusic();
                    }
                });
            } else if (this.backgroundMusicConfig.enabled && this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                // Audio context is already running, just start the music
                console.log('[View.js] Starting background music after user interaction');
                this.playBackgroundMusic();
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
        this.trees = new Trees()
        this.soundManager = new SoundManager()

        // Set fog texture for trees after Sky is initialized
        // We'll do this in update loop since Sky might not be ready yet

        // Initialize animal config
        this.animalConfig = {
            spawnRange: { cow: 300, bird: 300, wolf: 300, stag: 300, horse: 300, blackPanther: 300, deer: 300, sheep: 300 },
            number: { cow: 10, bird: 70, wolf: 8, stag: 8, horse: 12, blackPanther: 4, deer: 4, sheep: 4 },
            scale: { cow: 1.0, bird: 1.0, wolf: 1.0, stag: 1.0, horse: 1.0, blackPanther: 3.0, deer: 0.9, sheep: 0.5 },
            sound: { cow: true, bird: true, wolf: true, stag: true, horse: true, blackPanther: false, deer: false, sheep: false }
        }

        // Initialize sound config - CUSTOM DISTANCE ATTENUATION FOR ALL ANIMALS
        this.soundConfig = {
            delay: { cow: 8000, bird: 6000, wolf: 5000, stag: 6000, horse: 7000 },
            duration: { cow: 2500, bird: 2400, wolf: 2600, stag: 5000, horse: 2600 },
            volume: { cow: 0.4, bird: 0.25, wolf: 0.5, stag: 0.4, horse: 0.3 }, // Base volumes matching the individual files
            refDistance: { cow: 20, bird: 25, wolf: 15, stag: 10, horse: 12 }, // Effective distances matching the individual files  
            maxDistance: { cow: 80, bird: 80, wolf: 60, stag: 45, horse: 35 }, // Max distances matching the individual files
            rolloffFactor: { cow: 0, bird: 0, wolf: 0, stag: 0, horse: 0 } // All use custom attenuation now
        }

        // Initialize background music config
        this.backgroundMusicConfig = {
            enabled: true,
            volume: 0.25, // Giảm volume thêm để tương thích với custom cow attenuation
            fadeInDuration: 2000,
            fadeOutDuration: 1000,
            duckingEnabled: false, // Tắt ducking vì đã dùng PositionalAudio
            duckingVolume: 0.1, // Volume khi ducking
            usePositionalAudio: true // Dùng PositionalAudio thay vì Audio để tương thích
        }

        // Track active animal sounds for audio mixing
        this.activeAnimalSounds = new Set()

        // Initialize background music
        this.backgroundMusic = null
        this.initBackgroundMusic()

        this.enableRain = false
        this.rainEffect = null
        this.setDebugUI()
        this.setDebug()  // Add animal debug UI
        this.setBackgroundMusicDebug()  // Add background music debug UI
        if (this.enableRain)
            this.rainEffect = new RainStorm(this.scene, this.camera.instance)

        this.cows = []
        this.birds = []
        this.blackPanthers = []
        this.deers = []
        this.sheeps = []
        this.wolves = []
        this.stags = []
        this.horses = []
        const elevationIterations = stateTerrains.maxIterations;

        const playerInitialPositionArray = game.state.player.position.current;
        const playerInitialPos = new THREE.Vector3(playerInitialPositionArray[0], playerInitialPositionArray[1], playerInitialPositionArray[2]);
        
        const spawnOffsetDistance = 15;
        let frontSpawnX = playerInitialPos.x;
        let frontSpawnZ = playerInitialPos.z - spawnOffsetDistance;

        let yCowFront = this.terrainHelper.getElevation(frontSpawnX, frontSpawnZ, elevationIterations);
        const cowFrontPosition = new THREE.Vector3(frontSpawnX, yCowFront, frontSpawnZ);
        console.log(`[View.js] About to create special Cow at`, cowFrontPosition);
        const specialCow = new Cow(this.scene, game.state.time, cowFrontPosition, this.audioListener, true, this.soundConfig);
        this.cows.push(specialCow);
        console.log(`[View.js] Special Cow created successfully`);
        
        // Expose cow for debugging
        window.debugCow = specialCow;
        
        // Expose background music for debugging
        window.debugBackgroundMusic = this;
        
        // Expose player speed controls for debugging
        window.speedBoost = {
            enable300: () => game.state.player.enableTurboBoost(),
            disable: () => game.state.player.disableTurboBoost(),
            toggle: () => game.state.player.toggleTurboBoost(),
            setMultiplier: (value) => {
                game.state.player.speedMultiplier = value;
                console.log(`Speed multiplier set to: ${value}x`);
            },
            info: () => {
                console.log('Player Speed Info:', {
                    speedMultiplier: game.state.player.speedMultiplier,
                    turboBoostActive: game.state.player.turboBoostActive,
                    inputSpeed: game.state.player.inputSpeed,
                    inputBoostSpeed: game.state.player.inputBoostSpeed
                });
            }
        };

        // Enhanced sound debug commands
        window.soundDebug = {
            checkAll: () => {
                console.log(`=== ANIMAL STATUS ===`);
                console.log(`Cows: ${this.cows.length}`);
                console.log(`Birds: ${this.birds.length}`);
                console.log(`Wolves: ${this.wolves.length}`);
                console.log(`Stags: ${this.stags.length}`);
                console.log(`Horses: ${this.horses.length}`);
                console.log(`Total animals: ${this.cows.length + this.birds.length + this.wolves.length + this.stags.length + this.horses.length}`);
                
                // Check detailed status for each animal type
                console.log('\n=== DETAILED STATUS ===');
                
                // Check Cows
                console.log('🐄 COWS:');
                this.cows.slice(0, 2).forEach((cow, i) => {
                    console.log(`  Cow ${i}:`, {
                        hasModel: !!cow.model,
                        hasSound: !!cow.sound,
                        hasMixer: !!cow.mixer,
                        enableSoundOnLoad: cow.enableSoundOnLoad,
                        soundBuffer: cow.sound?.buffer ? 'loaded' : 'missing'
                    });
                });
                
                // Check Birds  
                console.log('🐦 BIRDS:');
                this.birds.slice(0, 2).forEach((bird, i) => {
                    console.log(`  Bird ${i}:`, {
                        hasModel: !!bird.model,
                        hasSound: !!bird.sound,
                        hasMixer: !!bird.mixer,
                        enableSoundOnLoad: bird.enableSoundOnLoad,
                        soundBuffer: bird.sound?.buffer ? 'loaded' : 'missing'
                    });
                });
                
                // Check Wolves
                console.log('🐺 WOLVES:');
                this.wolves.slice(0, 2).forEach((wolf, i) => {
                    console.log(`  Wolf ${i}:`, {
                        hasModel: !!wolf.model,
                        hasSound: !!wolf.sound,
                        hasMixer: !!wolf.mixer,
                        enableSoundOnLoad: wolf.enableSoundOnLoad,
                        soundBuffer: wolf.sound?.buffer ? 'loaded' : 'missing',
                        position: wolf.initialPosition
                    });
                });
                
                // Check Stags
                console.log('🦌 STAGS:');
                this.stags.slice(0, 2).forEach((stag, i) => {
                    console.log(`  Stag ${i}:`, {
                        hasModel: !!stag.model,
                        hasSound: !!stag.sound,
                        hasMixer: !!stag.mixer,
                        enableSoundOnLoad: stag.enableSoundOnLoad,
                        soundBuffer: stag.sound?.buffer ? 'loaded' : 'missing',
                        position: stag.initialPosition
                    });
                });
                
                // Check Horses
                console.log('🐎 HORSES:');
                this.horses.slice(0, 2).forEach((horse, i) => {
                    console.log(`  Horse ${i}:`, {
                        hasModel: !!horse.model,
                        hasSound: !!horse.sound,
                        hasMixer: !!horse.mixer,
                        enableSoundOnLoad: horse.enableSoundOnLoad,
                        soundBuffer: horse.sound?.buffer ? 'loaded' : 'missing',
                        position: horse.initialPosition
                    });
                });
            },
            testAllNow: () => {
                console.log('🔊 Testing all sounds immediately...');
                // Reset all delays to 0 and force play
                this.cows.forEach((cow, i) => {
                    if (cow.sound && cow.sound.buffer) {
                        cow.lastSoundTime = 0;
                        cow.soundDelay = i * 1000; // Stagger by 1 second each
                        console.log(`Cow ${i} delay reset to ${cow.soundDelay}ms`);
                    }
                });
                this.wolves.forEach((wolf, i) => {
                    if (wolf.sound && wolf.sound.buffer) {
                        wolf.lastSoundTime = 0;
                        wolf.soundDelay = (i + this.cows.length) * 1000;
                        console.log(`Wolf ${i} delay reset to ${wolf.soundDelay}ms`);
                    }
                });
                this.stags.forEach((stag, i) => {
                    if (stag.sound && stag.sound.buffer) {
                        stag.lastSoundTime = 0;
                        stag.soundDelay = (i + this.cows.length + this.wolves.length) * 1000;
                        console.log(`Stag ${i} delay reset to ${stag.soundDelay}ms`);
                    }
                });
                this.horses.forEach((horse, i) => {
                    if (horse.sound && horse.sound.buffer) {
                        horse.lastSoundTime = 0;
                        horse.soundDelay = (i + this.cows.length + this.wolves.length + this.stags.length) * 1000;
                        console.log(`Horse ${i} delay reset to ${horse.soundDelay}ms`);
                    }
                });
                this.birds.forEach((bird, i) => {
                    if (bird.sound && bird.sound.buffer) {
                        bird.lastSoundTime = 0;
                        bird.soundDelay = Math.floor(i / 10) * 1000; // Group birds together
                    }
                });
            },
            testAllImmediately: () => {
                console.log('Testing all sounds immediately...');
                this.wolves.forEach((wolf, i) => {
                    console.log(`Testing wolf ${i} sound...`);
                    if (wolf.playSound) wolf.playSound();
                });
                this.stags.forEach((stag, i) => {
                    console.log(`Testing stag ${i} sound...`);
                    if (stag.playSound) stag.playSound();
                });
                this.horses.forEach((horse, i) => {
                    console.log(`Testing horse ${i} sound...`);
                    if (horse.playSound) horse.playSound();
                });
            },
            forceEnableAllSounds: () => {
                console.log('Force enabling all sounds...');
                this.wolves.forEach(wolf => {
                    if (wolf.enableSound) wolf.enableSound();
                });
                this.stags.forEach(stag => {
                    if (stag.enableSound) stag.enableSound();
                });
                this.horses.forEach(horse => {
                    if (horse.enableSound) horse.enableSound();
                });
            },
            resetDelays: () => {
                console.log('Resetting all sound delays...');
                this.wolves.forEach(wolf => {
                    if (wolf.lastSoundTime !== undefined) wolf.lastSoundTime = 0;
                });
                this.stags.forEach(stag => {
                    if (stag.lastSoundTime !== undefined) stag.lastSoundTime = 0;
                });
                this.horses.forEach(horse => {
                    if (horse.lastSoundTime !== undefined) horse.lastSoundTime = 0;
                });
            },
            spawnOneWolf: () => {
                console.log('Spawning one wolf for testing...');
                const playerPos = Game.getInstance().state.player.position.current;
                const time = Date.now() / 1000;
                const x = playerPos[0] + 20; // 20 units away
                const z = playerPos[2] + 20;
                const y = this.terrainHelper.getElevation(x, z, Game.getInstance().state.terrains.maxIterations) + 0.5;
                
                try {
                    const wolf = new Wolf(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.wolf, this.soundConfig);
                    if (wolf.model) wolf.model.scale.setScalar(this.animalConfig.scale.wolf);
                    this.wolves.push(wolf);
                    console.log('Test wolf created successfully at:', x, y, z);
                    return wolf;
                } catch (error) {
                    console.error('Error creating test wolf:', error);
                    return null;
                }
            }
        };
        
        // Add console debugging commands
        window.cowDebug = {
            test: () => specialCow.testSound(),
            testWithSettings: (vol, ref, max, rolloff) => specialCow.testSoundWithSettings(vol, ref, max, rolloff),
            testLoud: () => specialCow.testSoundWithSettings(1.0, 1, 1000, 1),
            testClose: () => specialCow.testSoundWithSettings(1.0, 50, 1000, 0.5),
            // TEST METHODS TO COMPARE COW WITH OTHER ANIMALS
            testCowVsBird: () => {
                console.log('=== Testing Cow vs Bird Sound Quality ===');
                console.log('Playing cow sound...');
                specialCow.testSound();
                setTimeout(() => {
                    console.log('Playing bird sound...');
                    specialBird.testSound();
                }, 3000);
            },
            testWithMinimalSettings: () => {
                console.log('=== Testing cow with minimal settings ===');
                specialCow.testSoundWithSettings(0.1, 1, 1000, 0.5);
            },
            testStandardAudio: () => {
                console.log('=== Testing cow with standard Audio (non-positional) ===');
                specialCow.testWithStandardAudio();
            },
            testNoDistanceAttenuation: () => {
                console.log('=== Testing cow with NO distance attenuation ===');
                // Test với rolloffFactor = 0 (không có suy giảm khoảng cách)
                specialCow.testSoundWithSettings(0.5, 1000, 10000, 0);
            },
            testLinearVsExponential: () => {
                console.log('=== Testing different distance models ===');
                console.log('Current model: linear - Testing for 3 seconds...');
                specialCow.testSound();
                
                setTimeout(() => {
                    console.log('Switching to exponential model...');
                    if (specialCow.sound) {
                        specialCow.sound.panner.distanceModel = 'exponential';
                        specialCow.testSound();
                    }
                }, 4000);
                
                setTimeout(() => {
                    console.log('Switching to inverse model...');
                    if (specialCow.sound) {
                        specialCow.sound.panner.distanceModel = 'inverse';
                        specialCow.testSound();
                    }
                }, 8000);
            },
            liveDistanceTest: () => {
                console.log('=== Live Distance Testing - Move away from cow and run these ===');
                console.log('cowDebug.setNoAttenuation() - Remove distance effects');
                console.log('cowDebug.setLinearAttenuation() - Linear distance model');
                console.log('cowDebug.setInverseAttenuation() - Inverse distance model');
            },
            setNoAttenuation: () => {
                console.log('Setting NO distance attenuation...');
                specialCow.updateDistanceSettings(1000, 10000, 0, 'linear');
            },
            setLinearAttenuation: () => {
                console.log('Setting LINEAR attenuation...');
                specialCow.updateDistanceSettings(10, 100, 1, 'linear');
            },
            setInverseAttenuation: () => {
                console.log('Setting INVERSE attenuation...');
                specialCow.updateDistanceSettings(10, 100, 1, 'inverse');
            },
            // CUSTOM DISTANCE ATTENUATION CONTROLS
            enableDistanceLogging: () => {
                console.log('Enabling distance logging for cow...');
                specialCow.setDistanceLogging(true);
            },
            disableDistanceLogging: () => {
                console.log('Disabling distance logging for cow...');
                specialCow.setDistanceLogging(false);
            },
            testCustomDistance: () => {
                console.log('Testing custom distance attenuation...');
                console.log('Move near/far from cow to see volume changes');
                console.log('Use cowDebug.enableDistanceLogging() to see real-time distance/volume');
                specialCow.setDistanceLogging(true);
            },
            checkDistanceSystem: () => {
                console.log('=== Checking Distance System Status ===');
                specialCow.checkDistanceSystem();
            },
            testWithoutBG: () => {
                // Stop background music and test cow
                const wasPlaying = this.backgroundMusic?.isPlaying;
                if (wasPlaying) {
                    console.log('[Debug] Stopping BG music for cow test...');
                    this.backgroundMusic.stop();
                }
                setTimeout(() => {
                    specialCow.testSound();
                    // Restore BG music after test
                    if (wasPlaying) {
                        setTimeout(() => {
                            console.log('[Debug] Restarting BG music...');
                            this.playBackgroundMusic();
                        }, 3000);
                    }
                }, 100);
            },
            //     // Stop background music and test cow
            //     const wasPlaying = this.backgroundMusic?.isPlaying;
            //     if (wasPlaying) {
            //         console.log('[Debug] Stopping BG music for cow test...');
            //         this.backgroundMusic.stop();
            //     }
            //     setTimeout(() => {
            //         specialCow.testSound();
            //         // Restore BG music after test
            //         if (wasPlaying) {
            //             setTimeout(() => {
            //                 console.log('[Debug] Restarting BG music...');
            //                 this.playBackgroundMusic();
            //             }, 3000);
            //         }
            //     }, 100);
            // },
            checkAudioContext: () => {
                const ctx = this.audioListener.context;
                console.log('Audio Context Info:', {
                    state: ctx.state,
                    sampleRate: ctx.sampleRate,
                    currentTime: ctx.currentTime,
                    destination: ctx.destination,
                    activeSourceCount: ctx.audioWorklet ? 'Available' : 'Not available'
                });
                
                // Check if background music and cow sound use same context - COMMENTED OUT
                // console.log('Background Music Context:', this.backgroundMusic?.context === ctx);
                console.log('Cow Sound Context:', specialCow.sound?.context === ctx);
                
                // Check for audio mixing issues - COMMENTED OUT
                // if (this.backgroundMusic?.isPlaying && specialCow.sound?.isPlaying) {
                //     console.log('⚠️ Multiple audio sources playing simultaneously');
                //     console.log('BG Volume:', this.backgroundMusic.getVolume());
                //     console.log('Cow Volume:', specialCow.sound.getVolume());
                // }
            },
            info: () => {
                if (specialCow.sound) {
                    const soundBuffer = specialCow.sound.buffer;
                    const bgBuffer = this.backgroundMusic?.buffer;
                    
                    console.log('Cow Sound Info:', {
                        hasBuffer: !!soundBuffer,
                        volume: specialCow.sound.getVolume(),
                        isPlaying: specialCow.sound.isPlaying,
                        refDistance: specialCow.sound.panner?.refDistance,
                        maxDistance: specialCow.sound.panner?.maxDistance,
                        rolloffFactor: specialCow.sound.panner?.rolloffFactor,
                        distanceModel: specialCow.sound.panner?.distanceModel,
                        sampleRate: soundBuffer?.sampleRate,
                        duration: soundBuffer?.duration,
                        channels: soundBuffer?.numberOfChannels
                    });
                    
                    // BACKGROUND MUSIC INFO COMMENTED OUT FOR TESTING
                    // if (this.backgroundMusic && bgBuffer) {
                    //     console.log('Background Music Info:', {
                    //         volume: this.backgroundMusic.getVolume(),
                    //         isPlaying: this.backgroundMusic.isPlaying,
                    //         sampleRate: bgBuffer.sampleRate,
                    //         duration: bgBuffer.duration,
                    //         channels: bgBuffer.numberOfChannels
                    //     });
                        
                    //     // Check for sample rate mismatch
                    //     if (soundBuffer && bgBuffer.sampleRate !== soundBuffer.sampleRate) {
                    //         console.warn('⚠️ Sample rate mismatch detected!');
                    //         console.warn('BG Music:', bgBuffer.sampleRate, 'Hz');
                    //         console.warn('Cow Sound:', soundBuffer.sampleRate, 'Hz');
                    //     }
                    // }
                } else {
                    console.log('No cow sound object');
                }
            }
            // ALL BACKGROUND MUSIC RELATED COMMANDS COMMENTED OUT FOR TESTING
            // clearConflicts: () => this.clearAudioConflicts(),
            // duckTest: () => {
            //     console.log('[Debug] Testing audio ducking...');
            //     this.registerAnimalSound('cow-test');
            //     setTimeout(() => {
            //         this.unregisterAnimalSound('cow-test');
            //     }, 3000);
            // },
            // switchToPositional: () => {
            //     console.log('[Debug] Switching background music to PositionalAudio...');
            //     this.backgroundMusicConfig.usePositionalAudio = true;
            //     this.initBackgroundMusic();
            //     if (this.backgroundMusicConfig.enabled) {
            //         setTimeout(() => this.playBackgroundMusic(), 500);
            //     }
            // },
            // switchToStandard: () => {
            //     console.log('[Debug] Switching background music to standard Audio...');
            //     this.backgroundMusicConfig.usePositionalAudio = false;
            //     this.initBackgroundMusic();
            //     if (this.backgroundMusicConfig.enabled) {
            //         setTimeout(() => this.playBackgroundMusic(), 500);
            //     }
            // },
            // compareAudioTypes: () => {
            //     console.log('[Debug] Testing both audio types...');
            //     // Test với PositionalAudio
            //     console.log('Testing with PositionalAudio...');
            //     this.backgroundMusicConfig.usePositionalAudio = true;
            //     this.initBackgroundMusic();
            //     if (this.backgroundMusicConfig.enabled) {
            //         this.playBackgroundMusic();
            //     }
                
            //     setTimeout(() => {
            //         console.log('Now testing cow sound with PositionalAudio BG...');
            //         specialCow.testSound();
            //     }, 2000);
                
            //     setTimeout(() => {
            //         console.log('Switching to standard Audio...');
            //         this.backgroundMusicConfig.usePositionalAudio = false;
            //         this.initBackgroundMusic();
            //         if (this.backgroundMusicConfig.enabled) {
            //             this.playBackgroundMusic();
            //         }
            //     }, 6000);
                
            //     setTimeout(() => {
            //         console.log('Now testing cow sound with standard Audio BG...');
            //         specialCow.testSound();
            //     }, 8000);
            // }
        };

        const birdHeightOffset = 20;
        let yBirdFront = this.terrainHelper.getElevation(frontSpawnX, frontSpawnZ, elevationIterations) + birdHeightOffset;
        const birdFrontPosition = new THREE.Vector3(frontSpawnX, yBirdFront, frontSpawnZ);
        console.log(`[View.js] About to create special Bird at`, birdFrontPosition);
        const specialBird = new Bird(this.scene, game.state.time, birdFrontPosition, this.audioListener, true, this.soundConfig);
        this.birds.push(specialBird);
        console.log(`[View.js] Special Bird created successfully`);
        
        // Expose bird for debugging
        window.debugBird = specialBird;

        // Debug commands for sound-enabled animals  
        const view = this; // Capture view instance for debug commands
        
        // Add debug commands cho wolf (sẽ tạo wolf đầu tiên sau khi spawn)
        window.wolfDebug = {
            test: () => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.testSound) {
                    firstWolf.testSound();
                } else {
                    console.log('No wolf available or testSound method not found');
                }
            },
            testWithSettings: (vol, ref, max, rolloff) => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.testSoundWithSettings) {
                    firstWolf.testSoundWithSettings(vol, ref, max, rolloff);
                } else {
                    console.log('No wolf available or testSoundWithSettings method not found');
                }
            },
            enableDistanceLogging: () => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.setDistanceLogging) {
                    console.log('Enabling distance logging for wolf...');
                    firstWolf.setDistanceLogging(true);
                } else {
                    console.log('No wolf available or setDistanceLogging method not found');
                }
            },
            disableDistanceLogging: () => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.setDistanceLogging) {
                    console.log('Disabling distance logging for wolf...');
                    firstWolf.setDistanceLogging(false);
                } else {
                    console.log('No wolf available or setDistanceLogging method not found');
                }
            },
            checkDistanceSystem: () => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.checkDistanceSystem) {
                    console.log('=== Checking Wolf Distance System Status ===');
                    firstWolf.checkDistanceSystem();
                } else {
                    console.log('No wolf available or checkDistanceSystem method not found');
                }
            },
            info: () => {
                const firstWolf = view.wolves[0];
                if (firstWolf && firstWolf.sound) {
                    const soundBuffer = firstWolf.sound.buffer;
                    
                    console.log('Wolf Sound Info:', {
                        hasBuffer: !!soundBuffer,
                        volume: firstWolf.sound.getVolume(),
                        isPlaying: firstWolf.sound.isPlaying,
                        refDistance: firstWolf.sound.panner?.refDistance,
                        maxDistance: firstWolf.sound.panner?.maxDistance,
                        rolloffFactor: firstWolf.sound.panner?.rolloffFactor,
                        distanceModel: firstWolf.sound.panner?.distanceModel,
                        sampleRate: soundBuffer?.sampleRate,
                        duration: soundBuffer?.duration,
                        channels: soundBuffer?.numberOfChannels
                    });
                } else {
                    console.log('No wolf sound object available');
                }
            },
            testAllWolves: () => {
                console.log(`Testing all ${view.wolves.length} wolves...`);
                view.wolves.forEach((wolf, i) => {
                    if (wolf && wolf.testSound) {
                        console.log(`Testing wolf ${i}...`);
                        setTimeout(() => wolf.testSound(), i * 1500); // Stagger tests
                    }
                });
            }
        };

        // Add debug commands cho horse
        window.horseDebug = {
            test: () => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.testSound) {
                    firstHorse.testSound();
                } else {
                    console.log('No horse available or testSound method not found');
                }
            },
            testWithSettings: (vol, ref, max, rolloff) => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.testSoundWithSettings) {
                    firstHorse.testSoundWithSettings(vol, ref, max, rolloff);
                } else {
                    console.log('No horse available or testSoundWithSettings method not found');
                }
            },
            enableDistanceLogging: () => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.setDistanceLogging) {
                    console.log('Enabling distance logging for horse...');
                    firstHorse.setDistanceLogging(true);
                } else {
                    console.log('No horse available or setDistanceLogging method not found');
                }
            },
            disableDistanceLogging: () => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.setDistanceLogging) {
                    console.log('Disabling distance logging for horse...');
                    firstHorse.setDistanceLogging(false);
                } else {
                    console.log('No horse available or setDistanceLogging method not found');
                }
            },
            checkDistanceSystem: () => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.checkDistanceSystem) {
                    console.log('=== Checking Horse Distance System Status ===');
                    firstHorse.checkDistanceSystem();
                } else {
                    console.log('No horse available or checkDistanceSystem method not found');
                }
            },
            info: () => {
                const firstHorse = view.horses[0];
                if (firstHorse && firstHorse.sound) {
                    const soundBuffer = firstHorse.sound.buffer;
                    
                    console.log('Horse Sound Info:', {
                        hasBuffer: !!soundBuffer,
                        volume: firstHorse.sound.getVolume(),
                        isPlaying: firstHorse.sound.isPlaying,
                        refDistance: firstHorse.sound.panner?.refDistance,
                        maxDistance: firstHorse.sound.panner?.maxDistance,
                        rolloffFactor: firstHorse.sound.panner?.rolloffFactor,
                        distanceModel: firstHorse.sound.panner?.distanceModel,
                        sampleRate: soundBuffer?.sampleRate,
                        duration: soundBuffer?.duration,
                        channels: soundBuffer?.numberOfChannels
                    });
                } else {
                    console.log('No horse sound object available');
                }
            },
            testAllHorses: () => {
                console.log(`Testing all ${view.horses.length} horses...`);
                view.horses.forEach((horse, i) => {
                    if (horse && horse.testSound) {
                        console.log(`Testing horse ${i}...`);
                        setTimeout(() => horse.testSound(), i * 1500); // Stagger tests
                    }
                });
            }
        };

        // Add debug commands cho stag
        window.stagDebug = {
            test: () => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.testSound) {
                    firstStag.testSound();
                } else {
                    console.log('No stag available or testSound method not found');
                }
            },
            testWithSettings: (vol, ref, max, rolloff) => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.testSoundWithSettings) {
                    firstStag.testSoundWithSettings(vol, ref, max, rolloff);
                } else {
                    console.log('No stag available or testSoundWithSettings method not found');
                }
            },
            enableDistanceLogging: () => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.setDistanceLogging) {
                    console.log('Enabling distance logging for stag...');
                    firstStag.setDistanceLogging(true);
                } else {
                    console.log('No stag available or setDistanceLogging method not found');
                }
            },
            disableDistanceLogging: () => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.setDistanceLogging) {
                    console.log('Disabling distance logging for stag...');
                    firstStag.setDistanceLogging(false);
                } else {
                    console.log('No stag available or setDistanceLogging method not found');
                }
            },
            checkDistanceSystem: () => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.checkDistanceSystem) {
                    console.log('=== Checking Stag Distance System Status ===');
                    firstStag.checkDistanceSystem();
                } else {
                    console.log('No stag available or checkDistanceSystem method not found');
                }
            },
            info: () => {
                const firstStag = view.stags[0];
                if (firstStag && firstStag.sound) {
                    const soundBuffer = firstStag.sound.buffer;
                    
                    console.log('Stag Sound Info:', {
                        hasBuffer: !!soundBuffer,
                        volume: firstStag.sound.getVolume(),
                        isPlaying: firstStag.sound.isPlaying,
                        refDistance: firstStag.sound.panner?.refDistance,
                        maxDistance: firstStag.sound.panner?.maxDistance,
                        rolloffFactor: firstStag.sound.panner?.rolloffFactor,
                        distanceModel: firstStag.sound.panner?.distanceModel,
                        sampleRate: soundBuffer?.sampleRate,
                        duration: soundBuffer?.duration,
                        channels: soundBuffer?.numberOfChannels
                    });
                } else {
                    console.log('No stag sound object available');
                }
            },
            testAllStags: () => {
                console.log(`Testing all ${view.stags.length} stags...`);
                view.stags.forEach((stag, i) => {
                    if (stag && stag.testSound) {
                        console.log(`Testing stag ${i}...`);
                        setTimeout(() => stag.testSound(), i * 1500); // Stagger tests
                    }
                });
            }
        };

        window.animalSoundDebug = {
            testAllSounds: () => {
                console.log('=== Testing All Animal Sounds ===');
                if (window.debugCow) window.debugCow.testSound();
                setTimeout(() => {
                    if (window.debugBird) window.debugBird.testSound();
                }, 2000);
                setTimeout(() => {
                    const firstWolf = view.wolves[0];
                    if (firstWolf && firstWolf.sound) {
                        console.log('Testing wolf sound...');
                        firstWolf.sound.play();
                    } else {
                        console.log('No wolf or wolf sound available');
                    }
                }, 4000);
                setTimeout(() => {
                    const firstHorse = view.horses[0];
                    if (firstHorse && firstHorse.sound) {
                        console.log('Testing horse sound...');
                        firstHorse.sound.play();
                    } else {
                        console.log('No horse or horse sound available');
                    }
                }, 6000);
                setTimeout(() => {
                    const firstStag = view.stags[0];
                    if (firstStag && firstStag.sound) {
                        console.log('Testing stag sound...');
                        firstStag.sound.play();
                    } else {
                        console.log('No stag or stag sound available');
                    }
                }, 8000);
            },
            testWolf: () => {
                const wolf = view.wolves[0];
                if (wolf && wolf.sound) {
                    console.log('Testing wolf sound directly...');
                    wolf.sound.play();
                } else {
                    console.log('Wolf not found or no sound. Wolves array:', view.wolves.length);
                }
            },
            testHorse: () => {
                const horse = view.horses[0];
                if (horse && horse.sound) {
                    console.log('Testing horse sound directly...');
                    horse.sound.play();
                } else {
                    console.log('Horse not found or no sound. Horses array:', view.horses.length);
                }
            },
            testStag: () => {
                const stag = view.stags[0];
                if (stag && stag.sound) {
                    console.log('Testing stag sound directly...');
                    stag.sound.play();
                } else {
                    console.log('Stag not found or no sound. Stags array:', view.stags.length);
                }
            },
            checkSoundEnabledAnimals: () => {
                console.log('=== Sound-Enabled Animals Status ===');
                console.log('Wolves:', view.wolves.length, 'animals');
                view.wolves.forEach((wolf, i) => {
                    console.log(`Wolf ${i}:`, {
                        hasSound: !!wolf.sound,
                        hasModel: !!wolf.model,
                        isPlaying: wolf.isPlaying,
                        position: wolf.initialPosition
                    });
                });
                console.log('Horses:', view.horses.length, 'animals');
                view.horses.forEach((horse, i) => {
                    console.log(`Horse ${i}:`, {
                        hasSound: !!horse.sound,
                        hasModel: !!horse.model,
                        isPlaying: horse.isPlaying,
                        position: horse.initialPosition
                    });
                });
                console.log('Stags:', view.stags.length, 'animals');
                view.stags.forEach((stag, i) => {
                    console.log(`Stag ${i}:`, {
                        hasSound: !!stag.sound,
                        hasModel: !!stag.model,
                        isPlaying: stag.isPlaying,
                        position: stag.initialPosition
                    });
                });
            },
            forcePlayAll: () => {
                console.log('=== Force Playing All Sound-Enabled Animals ===');
                view.wolves.forEach((wolf, i) => {
                    if (wolf.sound) {
                        console.log(`Force playing wolf ${i}`);
                        wolf.isPlaying = false; // Reset playing state
                        wolf.lastSoundTime = 0; // Reset delay
                    }
                });
                view.horses.forEach((horse, i) => {
                    if (horse.sound) {
                        console.log(`Force playing horse ${i}`);
                        horse.isPlaying = false;
                        horse.lastSoundTime = 0;
                    }
                });
                view.stags.forEach((stag, i) => {
                    if (stag.sound) {
                        console.log(`Force playing stag ${i}`);
                        stag.isPlaying = false;
                        stag.lastSoundTime = 0;
                    }
                });
            }
        };

        // Using legacy hardcoded spawning (will be replaced by config system)
        const numberOfCows = 2;
        const numberOfBirds = 10;
        const numberOfPanthers = this.animalConfig.number.blackPanther;
        const numberOfDeers = this.animalConfig.number.deer;
        const numberOfSheeps = this.animalConfig.number.sheep;
        const pantherModelVerticalOffset = 0.5;
        const deerModelVerticalOffset = 0.5;

        for (let i = 0; i < numberOfCows - 1; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;
            const cowSpawnRange = this.animalConfig.spawnRange.cow;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * cowSpawnRange * 2;
                z = (Math.random() - 0.5) * cowSpawnRange * 2;
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
            const cow = new Cow(this.scene, game.state.time, position, this.audioListener, true, this.soundConfig);
            this.cows.push(cow);
            console.log(`[View.js] Cow ${i + 1} created successfully`);
        }

        for (let i = 0; i < numberOfBirds -1; i++) {
            const birdSpawnRange = this.animalConfig.spawnRange.bird;
            const x = (Math.random() - 0.5) * birdSpawnRange * 2;
            const z = (Math.random() - 0.5) * birdSpawnRange * 2;
            const y = this.terrainHelper.getElevation(x, z, elevationIterations) + birdHeightOffset;
            const position = new THREE.Vector3(x, y, z);
            console.log(`[View.js] About to create Bird ${i + 1} at`, position);
            const bird = new Bird(this.scene, game.state.time, position, this.audioListener, true, this.soundConfig);
            this.birds.push(bird);
            console.log(`[View.js] Bird ${i + 1} created successfully`);
        }

        for (let i = 0; i < numberOfPanthers; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;
            const pantherSpawnRange = this.animalConfig.spawnRange.blackPanther;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * pantherSpawnRange * 2;
                z = (Math.random() - 0.5) * pantherSpawnRange * 2;
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
            // Apply scale from config after model loads
            if (panther.model) panther.model.scale.setScalar(this.animalConfig.scale.blackPanther);
            this.blackPanthers.push(panther);
        }

        for (let i = 0; i < numberOfDeers; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;
            const deerSpawnRange = this.animalConfig.spawnRange.deer;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * deerSpawnRange * 2;
                z = (Math.random() - 0.5) * deerSpawnRange * 2;
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
            // Apply scale from config after model loads  
            if (deer.model) deer.model.scale.setScalar(this.animalConfig.scale.deer);
            this.deers.push(deer);
        }

        for (let i = 0; i < numberOfSheeps; i++) {
            let position;
            let attempts = 0;
            let x, z, y;
            let foundSuitableSpot = false;
            const sheepSpawnRange = this.animalConfig.spawnRange.sheep;

            while(attempts < MAX_SPAWN_ATTEMPTS_PER_ANIMAL && !foundSuitableSpot) {
                x = (Math.random() - 0.5) * sheepSpawnRange * 2;
                z = (Math.random() - 0.5) * sheepSpawnRange * 2;
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
            // Apply scale from config after model loads
            if (sheep.model) sheep.model.scale.setScalar(this.animalConfig.scale.sheep);
            this.sheeps.push(sheep);
        }

        // Spawn wolves, stags, horses using config system
        console.log('[View.js] About to call spawnSoundEnabledAnimals()');
        try {
            this.spawnSoundEnabledAnimals();
        } catch (error) {
            console.error('[View.js] Error in spawnSoundEnabledAnimals:', error);
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

    isFarFromOthers(x, z, animals, minDistance) {
        for (const animal of animals) {
            if (animal.initialPosition) {
                const distance = Math.sqrt(
                    Math.pow(x - animal.initialPosition.x, 2) + 
                    Math.pow(z - animal.initialPosition.z, 2)
                )
                if (distance < minDistance) {
                    return false
                }
            }
        }
        return true
    }

    setupLighting()
    {
        // Ambient light - ánh sáng môi trường để model không bị đen hoàn toàn
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.6) // Soft white light
        this.scene.add(this.ambientLight)

        // Directional light - mô phỏng ánh mặt trời với shadows
        this.directionalLight = new THREE.DirectionalLight('#ffffff', 0.8)
        this.directionalLight.position.set(-0.5, 1, -0.5) // Tương ứng với uSunPosition
        this.directionalLight.target.position.set(0, 0, 0)
        
        // Enable shadows for sun light
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.mapSize.width = 2048  // Shadow quality
        this.directionalLight.shadow.mapSize.height = 2048
        this.directionalLight.shadow.camera.near = 0.5
        this.directionalLight.shadow.camera.far = 50
        this.directionalLight.shadow.camera.left = -25
        this.directionalLight.shadow.camera.right = 25
        this.directionalLight.shadow.camera.top = 25
        this.directionalLight.shadow.camera.bottom = -25
        
        this.scene.add(this.directionalLight)
        this.scene.add(this.directionalLight.target)

        console.log('✨ Lighting system initialized for GLTF models')
    }

    setDebugUI()
    {
        const debug = Debug.getInstance()
        if (!debug.active) return

        // Trees Fog
        const treesFogFolder = debug.ui.getFolder('environment/trees-fog')
        treesFogFolder.add(this.trees, 'fogIntensity', 0, 0.01, 0.0001)
            .name('Fog Intensity')
            .onChange(() => {
                this.trees.setFogIntensity(this.trees.fogIntensity)
            })

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
        // Performance monitoring disabled
        // const startTime = performance.now()
        
        this.sky.update()
        this.water.update()
        this.terrains.update()
        this.chunks.update()
        this.player.update()
        this.grass.update()
        this.trees.update()

        // Set fog texture for trees if available and not set yet
        if (this.sky && this.sky.customRender && this.sky.customRender.texture && !this.trees.fogTexture) {
            console.log('🌫️ Setting fog texture for trees')
            this.trees.setFogTexture(this.sky.customRender.texture)
            // Also set screen resolution (use renderer size or default)
            const width = this.renderer?.viewport?.width || window.innerWidth || 1920
            const height = this.renderer?.viewport?.height || window.innerHeight || 1080
            this.trees.setScreenResolution(width, height)
        }

        
        // Performance monitoring disabled
        // const endTime = performance.now()
        // if (endTime - startTime > 16) { // More than 16ms = bad performance
        //     console.warn(`🐌 Slow frame: ${(endTime - startTime).toFixed(2)}ms`)
        // }

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

        for (const wolf of this.wolves) {
            wolf.update();
        }

        for (const stag of this.stags) {
            stag.update();
        }

        for (const horse of this.horses) {
            horse.update();
        }

        this.camera.update()
        this.renderer.update()
        
        // Update sound
        if(this.soundManager)
            this.soundManager.update()
        if (this.enableRain && this.rainEffect) this.rainEffect.update()
    }

    initBackgroundMusic() {
        if (!this.audioListener) {
            console.warn('[View.js] No audioListener available for background music');
            return;
        }

        console.log('[View.js] Initializing background music...');
        console.log('[View.js] Audio context state:', this.audioListener.context.state);
        console.log('[View.js] Audio context sample rate:', this.audioListener.context.sampleRate);
        
        const audioLoader = new THREE.AudioLoader();
        
        // Chọn loại audio dựa trên config
        if (this.backgroundMusicConfig.usePositionalAudio) {
            console.log('[View.js] Using PositionalAudio for background music');
            this.backgroundMusic = new THREE.PositionalAudio(this.audioListener);
        } else {
            console.log('[View.js] Using Audio for background music');
            this.backgroundMusic = new THREE.Audio(this.audioListener);
        }

        audioLoader.load('/sounds/soundBackground.mp3', (buffer) => {
            console.log('[View.js] Background music loaded successfully');
            console.log('[View.js] BG Music buffer - Sample Rate:', buffer.sampleRate, 'Duration:', buffer.duration, 'Channels:', buffer.numberOfChannels);
            
            // Check for potential issues
            if (buffer.sampleRate !== this.audioListener.context.sampleRate) {
                console.warn('[View.js] ⚠️ Sample rate mismatch between BG music and audio context!');
                console.warn('[View.js] Buffer:', buffer.sampleRate, 'Hz, Context:', this.audioListener.context.sampleRate, 'Hz');
            }
            
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(this.backgroundMusicConfig.volume);
            
            // Configure settings dựa trên loại audio
            if (this.backgroundMusicConfig.usePositionalAudio) {
                // Configure như global audio (không bị ảnh hưởng bởi khoảng cách)
                this.backgroundMusic.setRefDistance(10000); // Rất xa để volume không đổi
                this.backgroundMusic.setMaxDistance(50000); // Rất xa
                this.backgroundMusic.setRolloffFactor(0); // Không giảm theo khoảng cách
                this.backgroundMusic.setDistanceModel('linear'); // Sử dụng linear model
                this.backgroundMusic.setDirectionalCone(360, 360, 0); // Omnidirectional
                
                console.log('[View.js] Background music configured as pseudo-global PositionalAudio');
                
                // Attach to camera để follow player
                this.camera.instance.add(this.backgroundMusic);
            } else {
                console.log('[View.js] Background music configured as standard Audio');
                // Standard Audio không cần position settings
            }
            
            // Auto-play if enabled (after user interaction)
            if (this.backgroundMusicConfig.enabled) {
                this.playBackgroundMusic();
            }
        }, undefined, (error) => {
            console.error('[View.js] Failed to load background music:', error);
        });
    }

    playBackgroundMusic() {
        if (!this.backgroundMusic) {
            console.warn('[View.js] Background music not initialized');
            return;
        }

        // Try to resume audio context if suspended
        if (this.audioListener.context.state === 'suspended') {
            console.log('[View.js] Resuming audio context for background music...');
            this.audioListener.context.resume().then(() => {
                console.log('[View.js] Audio context resumed, playing background music');
                this.backgroundMusic.play();
                this.fadeInBackgroundMusic();
            });
        } else {
            console.log('[View.js] Playing background music');
            this.backgroundMusic.play();
            this.fadeInBackgroundMusic();
        }
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            console.log('[View.js] Stopping background music');
            this.fadeOutBackgroundMusic(() => {
                this.backgroundMusic.stop();
            });
        }
    }

    fadeInBackgroundMusic() {
        if (!this.backgroundMusic) return;
        
        this.backgroundMusic.setVolume(0);
        const targetVolume = this.backgroundMusicConfig.volume;
        const duration = this.backgroundMusicConfig.fadeInDuration;
        const steps = 50;
        const stepVolume = targetVolume / steps;
        const stepTime = duration / steps;

        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            const newVolume = Math.min(stepVolume * currentStep, targetVolume);
            this.backgroundMusic.setVolume(newVolume);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                console.log('[View.js] Background music fade in completed');
            }
        }, stepTime);
    }

    fadeOutBackgroundMusic(callback) {
        if (!this.backgroundMusic) return;
        
        const currentVolume = this.backgroundMusic.getVolume();
        const duration = this.backgroundMusicConfig.fadeOutDuration;
        const steps = 30;
        const stepVolume = currentVolume / steps;
        const stepTime = duration / steps;

        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            const newVolume = Math.max(currentVolume - (stepVolume * currentStep), 0);
            this.backgroundMusic.setVolume(newVolume);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                console.log('[View.js] Background music fade out completed');
                if (callback) callback();
            }
        }, stepTime);
    }

    toggleBackgroundMusic(enabled) {
        this.backgroundMusicConfig.enabled = enabled;
        if (enabled) {
            this.playBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
    }

    setBackgroundMusicVolume(volume) {
        this.backgroundMusicConfig.volume = volume;
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(volume);
        }
    }

    // Audio ducking for better mixing
    registerAnimalSound(animalType) {
        this.activeAnimalSounds.add(animalType);
        if (this.backgroundMusicConfig.duckingEnabled && this.backgroundMusic && this.backgroundMusic.isPlaying) {
            console.log('[View.js] Ducking background music for', animalType);
            this.backgroundMusic.setVolume(this.backgroundMusicConfig.duckingVolume);
        }
    }

    unregisterAnimalSound(animalType) {
        this.activeAnimalSounds.delete(animalType);
        if (this.activeAnimalSounds.size === 0 && this.backgroundMusic && this.backgroundMusic.isPlaying) {
            console.log('[View.js] Restoring background music volume');
            this.backgroundMusic.setVolume(this.backgroundMusicConfig.volume);
        }
    }

    // Force clear all audio contexts to avoid conflicts
    clearAudioConflicts() {
        console.log('[View.js] Clearing audio conflicts...');
        
        // Stop all animal sounds temporarily
        for (const cow of this.cows) {
            if (cow.sound && cow.sound.isPlaying) {
                cow.sound.stop();
                cow.isPlaying = false;
            }
        }
        
        for (const bird of this.birds) {
            if (bird.sound && bird.sound.isPlaying) {
                bird.sound.stop();
                bird.isPlaying = false;
            }
        }
        
        // Clear active sounds tracking
        this.activeAnimalSounds.clear();
        
        // Restore background music volume
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(this.backgroundMusicConfig.volume);
        }
        
        console.log('[View.js] Audio conflicts cleared');
    }

    setBackgroundMusicDebug() {
        const debug = Debug.getInstance()
        if (!debug.active) return
        
        const musicFolder = debug.ui.getFolder('environment/background music');
        
        // Enable/Disable toggle
        musicFolder.add(this.backgroundMusicConfig, 'enabled')
            .name('Enable Background Music')
            .onChange((value) => this.toggleBackgroundMusic(value));
        
        // Volume control
        musicFolder.add(this.backgroundMusicConfig, 'volume', 0, 1, 0.05)
            .name('Volume')
            .onChange((value) => this.setBackgroundMusicVolume(value));
        
        // Fade controls
        musicFolder.add(this.backgroundMusicConfig, 'fadeInDuration', 500, 5000, 100)
            .name('Fade In Duration (ms)');
        
        musicFolder.add(this.backgroundMusicConfig, 'fadeOutDuration', 500, 3000, 100)
            .name('Fade Out Duration (ms)');
        
        // Audio Ducking controls
        musicFolder.add(this.backgroundMusicConfig, 'duckingEnabled')
            .name('Enable Ducking')
            .onChange((value) => {
                if (!value) {
                    // Restore volume if ducking is disabled
                    this.backgroundMusic?.setVolume(this.backgroundMusicConfig.volume);
                }
            });
        
        musicFolder.add(this.backgroundMusicConfig, 'duckingVolume', 0, 0.5, 0.05)
            .name('Ducking Volume');
        
        // Audio type toggle
        musicFolder.add(this.backgroundMusicConfig, 'usePositionalAudio')
            .name('Use PositionalAudio')
            .onChange((value) => {
                console.log('[View.js] Switching audio type to:', value ? 'PositionalAudio' : 'Audio');
                // Restart background music với type mới
                const wasPlaying = this.backgroundMusic?.isPlaying;
                if (this.backgroundMusic) {
                    this.backgroundMusic.stop();
                    if (this.backgroundMusicConfig.usePositionalAudio && this.camera.instance.children.includes(this.backgroundMusic)) {
                        this.camera.instance.remove(this.backgroundMusic);
                    }
                }
                
                // Reinitialize với type mới
                setTimeout(() => {
                    this.initBackgroundMusic();
                    if (wasPlaying && this.backgroundMusicConfig.enabled) {
                        setTimeout(() => this.playBackgroundMusic(), 500);
                    }
                }, 100);
            });
        
        // Manual controls
        const controls = {
            play: () => this.playBackgroundMusic(),
            stop: () => this.stopBackgroundMusic(),
            testFadeIn: () => this.fadeInBackgroundMusic(),
            testFadeOut: () => this.fadeOutBackgroundMusic(),
            clearConflicts: () => this.clearAudioConflicts()
        };
        
        musicFolder.add(controls, 'play').name('Play Now');
        musicFolder.add(controls, 'stop').name('Stop Now');
        musicFolder.add(controls, 'testFadeIn').name('Test Fade In');
        musicFolder.add(controls, 'testFadeOut').name('Test Fade Out');
        musicFolder.add(controls, 'clearConflicts').name('Clear Audio Conflicts');

        console.log('[View.js] Background music debug controls added');
    }

    destroy()
    {
        // Stop background music when destroying
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
    }

    setDebug() {
        const debug = Debug.getInstance()
        if (!debug.active) return
        
        // Player Speed Controls
        const playerFolder = debug.ui.getFolder('player');
        const game = Game.getInstance();
        const speedControls = {
            speedMultiplier: 1.0,
            turboBoost: false,
            toggleTurbo: () => {
                const player = game.state.player;
                player.toggleTurboBoost();
                speedControls.turboBoost = player.turboBoostActive;
                speedControls.speedMultiplier = player.speedMultiplier;
            },
            enable300Boost: () => {
                const player = game.state.player;
                player.enableTurboBoost();
                speedControls.turboBoost = player.turboBoostActive;
                speedControls.speedMultiplier = player.speedMultiplier;
            },
            disableBoost: () => {
                const player = game.state.player;
                player.disableTurboBoost();
                speedControls.turboBoost = player.turboBoostActive;
                speedControls.speedMultiplier = player.speedMultiplier;
            }
        };
        
        playerFolder.add(speedControls, 'speedMultiplier', 0.1, 10, 0.1).name('Speed Multiplier').listen().onChange((value) => {
            game.state.player.speedMultiplier = value;
        });
        
        playerFolder.add(speedControls, 'turboBoost').name('Turbo Boost Active').listen();
        
        playerFolder.add(speedControls, 'toggleTurbo').name('🚀 Toggle Turbo (300%)');
        playerFolder.add(speedControls, 'enable300Boost').name('⚡ Enable 300% Speed');
        playerFolder.add(speedControls, 'disableBoost').name('🏃 Normal Speed');
        
        const animalsFolder = debug.ui.getFolder('environment/animals');

        // Spawn Range
        const spawnRangeFolder = animalsFolder.addFolder('spawn range');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'cow', 10, 500, 1).name('Cow');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'bird', 10, 500, 1).name('Bird');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'wolf', 10, 500, 1).name('Wolf');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'stag', 10, 500, 1).name('Stag');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'horse', 10, 500, 1).name('Horse');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'blackPanther', 10, 500, 1).name('Black Panther');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'deer', 10, 500, 1).name('Deer');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'sheep', 10, 500, 1).name('Sheep');

        // Number
        const numberFolder = animalsFolder.addFolder('number');
        numberFolder.add(this.animalConfig.number, 'cow', 0, 20, 1).name('Cow');
        numberFolder.add(this.animalConfig.number, 'bird', 0, 50, 1).name('Bird');
        numberFolder.add(this.animalConfig.number, 'wolf', 0, 10, 1).name('Wolf');
        numberFolder.add(this.animalConfig.number, 'stag', 0, 20, 1).name('Stag');
        numberFolder.add(this.animalConfig.number, 'horse', 0, 20, 1).name('Horse');
        numberFolder.add(this.animalConfig.number, 'blackPanther', 0, 10, 1).name('Black Panther');
        numberFolder.add(this.animalConfig.number, 'deer', 0, 20, 1).name('Deer');
        numberFolder.add(this.animalConfig.number, 'sheep', 0, 30, 1).name('Sheep');

        // Scale
        const scaleFolder = animalsFolder.addFolder('scale');
        scaleFolder.add(this.animalConfig.scale, 'cow', 0.1, 5, 0.01).name('Cow');
        scaleFolder.add(this.animalConfig.scale, 'bird', 0.1, 5, 0.01).name('Bird');
        scaleFolder.add(this.animalConfig.scale, 'wolf', 0.1, 5, 0.01).name('Wolf');
        scaleFolder.add(this.animalConfig.scale, 'stag', 0.1, 5, 0.01).name('Stag');
        scaleFolder.add(this.animalConfig.scale, 'horse', 0.1, 5, 0.01).name('Horse');
        scaleFolder.add(this.animalConfig.scale, 'blackPanther', 0.1, 5, 0.01).name('Black Panther');
        scaleFolder.add(this.animalConfig.scale, 'deer', 0.1, 5, 0.01).name('Deer');
        scaleFolder.add(this.animalConfig.scale, 'sheep', 0.1, 5, 0.01).name('Sheep');

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

        // Sound Settings
        const soundSettingsFolder = animalsFolder.addFolder('sound settings');
        
        // Sound Delay
        const delayFolder = soundSettingsFolder.addFolder('delay (ms)');
        delayFolder.add(this.soundConfig.delay, 'cow', 1000, 10000, 100).name('Cow').onChange(() => this.applySoundConfig());
        delayFolder.add(this.soundConfig.delay, 'bird', 1000, 10000, 100).name('Bird').onChange(() => this.applySoundConfig());
        delayFolder.add(this.soundConfig.delay, 'wolf', 1000, 10000, 100).name('Wolf').onChange(() => this.applySoundConfig());
        delayFolder.add(this.soundConfig.delay, 'stag', 1000, 10000, 100).name('Stag').onChange(() => this.applySoundConfig());
        delayFolder.add(this.soundConfig.delay, 'horse', 1000, 10000, 100).name('Horse').onChange(() => this.applySoundConfig());

        // Sound Duration
        const durationFolder = soundSettingsFolder.addFolder('duration (ms)');
        durationFolder.add(this.soundConfig.duration, 'cow', 500, 5000, 100).name('Cow').onChange(() => this.applySoundConfig());
        durationFolder.add(this.soundConfig.duration, 'bird', 500, 5000, 100).name('Bird').onChange(() => this.applySoundConfig());
        durationFolder.add(this.soundConfig.duration, 'wolf', 500, 5000, 100).name('Wolf').onChange(() => this.applySoundConfig());
        durationFolder.add(this.soundConfig.duration, 'stag', 500, 5000, 100).name('Stag').onChange(() => this.applySoundConfig());
        durationFolder.add(this.soundConfig.duration, 'horse', 500, 5000, 100).name('Horse').onChange(() => this.applySoundConfig());

        // Volume
        const volumeFolder = soundSettingsFolder.addFolder('volume');
        volumeFolder.add(this.soundConfig.volume, 'cow', 0, 1, 0.05).name('Cow').onChange(() => this.applySoundConfig());
        volumeFolder.add(this.soundConfig.volume, 'bird', 0, 1, 0.05).name('Bird').onChange(() => this.applySoundConfig());
        volumeFolder.add(this.soundConfig.volume, 'wolf', 0, 1, 0.05).name('Wolf').onChange(() => this.applySoundConfig());
        volumeFolder.add(this.soundConfig.volume, 'stag', 0, 1, 0.05).name('Stag').onChange(() => this.applySoundConfig());
        volumeFolder.add(this.soundConfig.volume, 'horse', 0, 1, 0.05).name('Horse').onChange(() => this.applySoundConfig());

        // Ref Distance
        const refDistanceFolder = soundSettingsFolder.addFolder('ref distance');
        refDistanceFolder.add(this.soundConfig.refDistance, 'cow', 1, 10, 0.5).name('Cow').onChange(() => this.applySoundConfig());
        refDistanceFolder.add(this.soundConfig.refDistance, 'bird', 1, 10, 0.5).name('Bird').onChange(() => this.applySoundConfig());
        refDistanceFolder.add(this.soundConfig.refDistance, 'wolf', 1, 10, 0.5).name('Wolf').onChange(() => this.applySoundConfig());
        refDistanceFolder.add(this.soundConfig.refDistance, 'stag', 1, 10, 0.5).name('Stag').onChange(() => this.applySoundConfig());
        refDistanceFolder.add(this.soundConfig.refDistance, 'horse', 1, 10, 0.5).name('Horse').onChange(() => this.applySoundConfig());

        // Max Distance
        const maxDistanceFolder = soundSettingsFolder.addFolder('max distance');
        maxDistanceFolder.add(this.soundConfig.maxDistance, 'cow', 5, 50, 1).name('Cow').onChange(() => this.applySoundConfig());
        maxDistanceFolder.add(this.soundConfig.maxDistance, 'bird', 5, 50, 1).name('Bird').onChange(() => this.applySoundConfig());
        maxDistanceFolder.add(this.soundConfig.maxDistance, 'wolf', 5, 50, 1).name('Wolf').onChange(() => this.applySoundConfig());
        maxDistanceFolder.add(this.soundConfig.maxDistance, 'stag', 5, 50, 1).name('Stag').onChange(() => this.applySoundConfig());
        maxDistanceFolder.add(this.soundConfig.maxDistance, 'horse', 5, 50, 1).name('Horse').onChange(() => this.applySoundConfig());

        // Rolloff Factor
        const rolloffFolder = soundSettingsFolder.addFolder('rolloff factor');
        rolloffFolder.add(this.soundConfig.rolloffFactor, 'cow', 0.5, 5, 0.1).name('Cow').onChange(() => this.applySoundConfig());
        rolloffFolder.add(this.soundConfig.rolloffFactor, 'bird', 0.5, 5, 0.1).name('Bird').onChange(() => this.applySoundConfig());
        rolloffFolder.add(this.soundConfig.rolloffFactor, 'wolf', 0.5, 5, 0.1).name('Wolf').onChange(() => this.applySoundConfig());
        rolloffFolder.add(this.soundConfig.rolloffFactor, 'stag', 0.5, 5, 0.1).name('Stag').onChange(() => this.applySoundConfig());
        rolloffFolder.add(this.soundConfig.rolloffFactor, 'horse', 0.5, 5, 0.1).name('Horse').onChange(() => this.applySoundConfig());
    }

    applyAnimalConfig() {
        // Remove old animals from scene
        for (const cow of this.cows) if (cow.model) this.scene.remove(cow.model);
        for (const bird of this.birds) if (bird.model) this.scene.remove(bird.model);
        for (const panther of this.blackPanthers) if (panther.model) this.scene.remove(panther.model);
        for (const deer of this.deers) if (deer.model) this.scene.remove(deer.model);
        for (const sheep of this.sheeps) if (sheep.model) this.scene.remove(sheep.model);
        for (const wolf of this.wolves) if (wolf.model) this.scene.remove(wolf.model);
        for (const stag of this.stags) if (stag.model) this.scene.remove(stag.model);
        for (const horse of this.horses) if (horse.model) this.scene.remove(horse.model);
        this.cows = [];
        this.birds = [];
        this.blackPanthers = [];
        this.deers = [];
        this.sheeps = [];
        this.wolves = [];
        this.stags = [];
        this.horses = [];

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
        for (const wolf of this.wolves) {
            if (this.animalConfig.sound.wolf) {
                wolf.enableSound();
            } else {
                wolf.disableSound();
            }
        }
        for (const stag of this.stags) {
            if (this.animalConfig.sound.stag) {
                stag.enableSound();
            } else {
                stag.disableSound();
            }
        }
        for (const horse of this.horses) {
            if (this.animalConfig.sound.horse) {
                horse.enableSound();
            } else {
                horse.disableSound();
            }
        }
        // BlackPanther, Deer, Sheep don't have sound methods - skip sound config
    }

    applySoundConfig() {
        // Update sound config cho tất cả animals hiện tại
        for (const cow of this.cows) {
            if (cow.sound) {
                cow.sound.setVolume(this.soundConfig.volume.cow);
                cow.sound.setRefDistance(this.soundConfig.refDistance.cow);
                cow.sound.setMaxDistance(this.soundConfig.maxDistance.cow);
                cow.sound.setRolloffFactor(this.soundConfig.rolloffFactor.cow);
            }
            // Update delay và duration
            cow.soundDelay = this.soundConfig.delay.cow;
            cow.soundDuration = this.soundConfig.duration.cow;
        }

        for (const bird of this.birds) {
            if (bird.sound) {
                bird.sound.setVolume(this.soundConfig.volume.bird);
                bird.sound.setRefDistance(this.soundConfig.refDistance.bird);
                bird.sound.setMaxDistance(this.soundConfig.maxDistance.bird);
                bird.sound.setRolloffFactor(this.soundConfig.rolloffFactor.bird);
            }
            bird.soundDelay = this.soundConfig.delay.bird;
            bird.soundDuration = this.soundConfig.duration.bird;
        }

        for (const wolf of this.wolves) {
            if (wolf.sound) {
                wolf.sound.setVolume(this.soundConfig.volume.wolf);
                wolf.sound.setRefDistance(this.soundConfig.refDistance.wolf);
                wolf.sound.setMaxDistance(this.soundConfig.maxDistance.wolf);
                wolf.sound.setRolloffFactor(this.soundConfig.rolloffFactor.wolf);
            }
            wolf.soundDelay = this.soundConfig.delay.wolf;
            wolf.soundDuration = this.soundConfig.duration.wolf;
        }

        for (const stag of this.stags) {
            if (stag.sound) {
                stag.sound.setVolume(this.soundConfig.volume.stag);
                stag.sound.setRefDistance(this.soundConfig.refDistance.stag);
                stag.sound.setMaxDistance(this.soundConfig.maxDistance.stag);
                stag.sound.setRolloffFactor(this.soundConfig.rolloffFactor.stag);
            }
            stag.soundDelay = this.soundConfig.delay.stag;
            stag.soundDuration = this.soundConfig.duration.stag;
        }

        for (const horse of this.horses) {
            if (horse.sound) {
                horse.sound.setVolume(this.soundConfig.volume.horse);
                horse.sound.setRefDistance(this.soundConfig.refDistance.horse);
                horse.sound.setMaxDistance(this.soundConfig.maxDistance.horse);
                horse.sound.setRolloffFactor(this.soundConfig.rolloffFactor.horse);
            }
            horse.soundDelay = this.soundConfig.delay.horse;
            horse.soundDuration = this.soundConfig.duration.horse;
        }

        console.log('[View.js] Sound config applied to all animals');
    }

    spawnSoundEnabledAnimals() {
        console.log(`[View.js] Starting spawnSoundEnabledAnimals()`);
        const playerPos = Game.getInstance().state.player.position.current;
        const time = Date.now() / 1000;
        
        // Wolves
        console.log(`[View.js] Spawning ${this.animalConfig.number.wolf} wolves...`);
        for (let i = 0; i < this.animalConfig.number.wolf; i++) {
            const range = this.animalConfig.spawnRange.wolf;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, Game.getInstance().state.terrains.maxIterations, PANTHER_FLATNESS_CHECK_DISTANCE, PANTHER_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.wolves, 3)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, Game.getInstance().state.terrains.maxIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Wolf after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            try {
                const wolf = new Wolf(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.wolf, this.soundConfig);
                if (wolf.model) wolf.model.scale.setScalar(this.animalConfig.scale.wolf);
                this.wolves.push(wolf);
                console.log(`[View.js] Wolf ${i} created successfully`);
            } catch (error) {
                console.error(`[View.js] Error creating Wolf ${i}:`, error);
            }
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
                    this.isPositionSuitable(x, z, Game.getInstance().state.terrains.maxIterations, STAG_FLATNESS_CHECK_DISTANCE, STAG_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.stags, 3)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, Game.getInstance().state.terrains.maxIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Stag after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            try {
                const stag = new Stag(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.stag, this.soundConfig);
                if (stag.model) stag.model.scale.setScalar(this.animalConfig.scale.stag);
                this.stags.push(stag);
                console.log(`[View.js] Stag ${i} created successfully`);
            } catch (error) {
                console.error(`[View.js] Error creating Stag ${i}:`, error);
            }
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
                    this.isPositionSuitable(x, z, Game.getInstance().state.terrains.maxIterations, HORSE_FLATNESS_CHECK_DISTANCE, HORSE_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.horses, 3)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, Game.getInstance().state.terrains.maxIterations);
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Horse after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            try {
                const horse = new Horse(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.horse, this.soundConfig);
                if (horse.model) horse.model.scale.setScalar(this.animalConfig.scale.horse);
                this.horses.push(horse);
                console.log(`[View.js] Horse ${i} created successfully`);
            } catch (error) {
                console.error(`[View.js] Error creating Horse ${i}:`, error);
            }
        }
        
        console.log('[View.js] Sound-enabled animals spawned: Wolves(' + this.wolves.length + '), Stags(' + this.stags.length + '), Horses(' + this.horses.length + ')');
        
        // Enhanced debug logging for sound-enabled animals
        this.wolves.forEach((wolf, i) => {
            console.log(`[View.js] Wolf ${i} created at:`, wolf.initialPosition, 'Sound enabled:', wolf.enableSoundOnLoad);
        });
        this.stags.forEach((stag, i) => {
            console.log(`[View.js] Stag ${i} created at:`, stag.initialPosition, 'Sound enabled:', stag.enableSoundOnLoad);
        });
        this.horses.forEach((horse, i) => {
            console.log(`[View.js] Horse ${i} created at:`, horse.initialPosition, 'Sound enabled:', horse.enableSoundOnLoad);
        });
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
            const cow = new Cow(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.cow, this.soundConfig);
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
            const bird = new Bird(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.bird, this.soundConfig);
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
                    this.isFarFromOthers(x, z, this.wolves, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Wolf after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const wolf = new Wolf(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.wolf, this.soundConfig);
            if (wolf.model) wolf.model.scale.setScalar(this.animalConfig.scale.wolf);
            this.wolves.push(wolf);
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
                    this.isFarFromOthers(x, z, this.stags, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Stag after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            try {
                const stag = new Stag(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.stag, this.soundConfig);
                if (stag.model) stag.model.scale.setScalar(this.animalConfig.scale.stag);
                this.stags.push(stag);
                console.log(`[View.js] Stag ${i} created successfully`);
            } catch (error) {
                console.error(`[View.js] Error creating Stag ${i}:`, error);
            }
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
                    this.isFarFromOthers(x, z, this.horses, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations);
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Horse after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            try {
                const horse = new Horse(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.horse, this.soundConfig);
                if (horse.model) horse.model.scale.setScalar(this.animalConfig.scale.horse);
                this.horses.push(horse);
                console.log(`[View.js] Horse ${i} created successfully`);
            } catch (error) {
                console.error(`[View.js] Error creating Horse ${i}:`, error);
            }
        }
        // Black Panthers
        for (let i = 0; i < this.animalConfig.number.blackPanther; i++) {
            const range = this.animalConfig.spawnRange.blackPanther;
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
                console.warn(`[View.js] Could not find a flat spot for BlackPanther after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const blackPanther = new BlackPanther(this.scene, time, new THREE.Vector3(x, y, z));
            if (blackPanther.model) blackPanther.model.scale.setScalar(this.animalConfig.scale.blackPanther);
            this.blackPanthers.push(blackPanther);
        }
        // Deer
        for (let i = 0; i < this.animalConfig.number.deer; i++) {
            const range = this.animalConfig.spawnRange.deer;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, DEER_FLATNESS_CHECK_DISTANCE, DEER_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.deers, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Deer after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const deer = new Deer(this.scene, time, new THREE.Vector3(x, y, z));
            if (deer.model) deer.model.scale.setScalar(this.animalConfig.scale.deer);
            this.deers.push(deer);
        }
        // Sheep
        for (let i = 0; i < this.animalConfig.number.sheep; i++) {
            const range = this.animalConfig.spawnRange.sheep;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, SHEEP_FLATNESS_CHECK_DISTANCE, SHEEP_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.sheeps, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations);
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Sheep after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const sheep = new Sheep(this.scene, time, new THREE.Vector3(x, y, z));
            if (sheep.model) sheep.model.scale.setScalar(this.animalConfig.scale.sheep);
            this.sheeps.push(sheep);
        }
    }
}