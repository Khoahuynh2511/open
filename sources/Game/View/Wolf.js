import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Wolf {
    constructor(scene, time, initialPosition, audioListener, enableSound, soundConfig = null) {
        console.log('[Wolf.js] Constructor started for wolf at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition;
        this.audioListener = audioListener;
        this.sound = null;
        this.enableSoundOnLoad = enableSound;
        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        // Sound delay system - sử dụng soundConfig nếu có
        if (soundConfig) {
            this.soundDelay = soundConfig.delay.wolf + Math.random() * 1000;
            this.soundDuration = soundConfig.duration.wolf;
            this.soundConfig = soundConfig;
        } else {
            this.soundDelay = 4000 + Math.random() * 3000; // 4-7 giây delay (sói ít kêu hơn)
            this.soundDuration = 3000; // Kêu trong 3 giây
        }
        this.lastSoundTime = 0;
        this.isPlaying = false;

        this.loadModel()
        console.log('[Wolf.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Wolf.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Wolf.glb', // Path to the model
            (gltf) => {
                console.log('[Wolf.js] Model loaded successfully:', gltf);
                this.model = gltf.scene
                this.model.scale.set(0.9, 0.9, 0.9) // Initial scale
                this.model.position.copy(this.initialPosition);
                this.model.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
                this.scene.add(this.model)
                console.log('[Wolf.js] Model added to scene at', this.initialPosition);
                if (gltf.animations && gltf.animations.length) {
                    console.log('[Wolf.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0])
                    action.timeScale = 0.5;
                    action.play()
                    console.log('[Wolf.js] Animation started:', gltf.animations[0].name);
                } else {
                    console.log('[Wolf.js] No animations found in model');
                }
                console.log('[Wolf.js] enableSoundOnLoad:', this.enableSoundOnLoad);
                if (this.enableSoundOnLoad) {
                    console.log('[Wolf.js] Calling enableSound() after model load');
                    this.enableSound();
                } else {
                    console.log('[Wolf.js] Sound not enabled on load');
                }
            },
            undefined,
            (error) => {
                console.error('[Wolf.js] An error happened while loading the wolf model:', error)
            }
        )
    }

    enableSound() {
        console.log('[Wolf.js] enableSound called');
        console.log('[Wolf.js] audioListener exists:', !!this.audioListener);
        console.log('[Wolf.js] model exists:', !!this.model);
        
        if (this.sound) {
            this.model.remove(this.sound);
            this.sound.stop();
            this.sound = null;
        }
        if (!this.audioListener || !this.model) {
            console.log('[Wolf.js] enableSound aborted - missing audioListener or model');
            return;
        }
        
        console.log('[Wolf.js] AudioListener context state:', this.audioListener.context.state);
        
        const audioLoader = new THREE.AudioLoader();
        this.sound = new THREE.PositionalAudio(this.audioListener);
        console.log('[Wolf.js] PositionalAudio created');
        
        audioLoader.load('/sounds/wolf.mp3', (buffer) => {
            console.log('[Wolf.js] Wolf sound loaded successfully:', buffer);
            console.log('[Wolf.js] Buffer details - Duration:', buffer.duration, 'Sample Rate:', buffer.sampleRate, 'Channels:', buffer.numberOfChannels);
            
            this.sound.setBuffer(buffer);
            
            // DISABLE THREE.JS DISTANCE ATTENUATION - WE'LL HANDLE IT MANUALLY
            this.sound.setDistanceModel('linear');
            this.sound.setRefDistance(10000); // Very high ref distance
            this.sound.setRolloffFactor(0);   // No automatic rolloff
            this.sound.setMaxDistance(20000); // Very high max distance
            
            // Store base volume and distance settings for manual calculation
            if (this.soundConfig) {
                this.baseVolume = this.soundConfig.volume.wolf;
                this.effectiveDistance = this.soundConfig.refDistance.wolf;
                this.maxEffectiveDistance = this.soundConfig.maxDistance.wolf;
            } else {
                this.baseVolume = 0.35;
                this.effectiveDistance = 15; // Wolf kêu mạnh, nghe xa hơn
                this.maxEffectiveDistance = 50; // Tầm nghe xa
            }
            
            // Validate values
            this.baseVolume = isFinite(this.baseVolume) && this.baseVolume > 0 ? this.baseVolume : 0.35;
            this.effectiveDistance = isFinite(this.effectiveDistance) && this.effectiveDistance > 0 ? this.effectiveDistance : 15;
            this.maxEffectiveDistance = isFinite(this.maxEffectiveDistance) && this.maxEffectiveDistance > this.effectiveDistance ? this.maxEffectiveDistance : this.effectiveDistance + 35;
            
            this.sound.setVolume(this.baseVolume); // Set initial volume
            this.sound.setLoop(false);        // Không loop liên tục
            
            console.log('[Wolf.js] Custom distance attenuation enabled - BaseVolume:', this.baseVolume, 'EffectiveDistance:', this.effectiveDistance, 'MaxDistance:', this.maxEffectiveDistance);
            
            // Check audio context properties
            console.log('[Wolf.js] Audio context sample rate:', this.audioListener.context.sampleRate);
            console.log('[Wolf.js] Audio context state:', this.audioListener.context.state);
            console.log('[Wolf.js] Sound setup completed for wolf');
        }, (progress) => {
            console.log('[Wolf.js] Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
        }, (error) => {
            console.error('[Wolf.js] Error loading wolf sound:', error);
        });
        this.model.add(this.sound);
        console.log('[Wolf.js] Sound added to model');
    }

    disableSound() {
        if (this.sound) {
            this.sound.stop();
            this.model.remove(this.sound);
            this.sound = null;
        }
    }

    // Test method để kiểm tra sound ngay lập tức
    testSound() {
        if (this.sound) {
            console.log('[Wolf.js] Testing wolf sound immediately...');
            console.log('[Wolf.js] Sound buffer:', this.sound.buffer);
            console.log('[Wolf.js] Sound volume:', this.sound.getVolume());
            console.log('[Wolf.js] Audio context state:', this.audioListener.context.state);
            console.log('[Wolf.js] Distance model:', this.sound.panner.distanceModel);
            console.log('[Wolf.js] Ref distance:', this.sound.panner.refDistance);
            console.log('[Wolf.js] Max distance:', this.sound.panner.maxDistance);
            console.log('[Wolf.js] Rolloff factor:', this.sound.panner.rolloffFactor);
            
            if (this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    console.log('[Wolf.js] Audio context resumed for test');
                    this.sound.play();
                    setTimeout(() => this.sound.stop(), 2000);
                });
            } else {
                this.sound.play();
                setTimeout(() => this.sound.stop(), 2000);
            }
        } else {
            console.log('[Wolf.js] No sound object available for testing');
        }
    }

    // Method to calculate custom distance attenuation
    updateVolumeBasedOnDistance(listenerPosition) {
        if (!this.sound || !this.model || !listenerPosition) return;
        
        // Safety checks for required values
        if (!this.baseVolume || !this.effectiveDistance || !this.maxEffectiveDistance) {
            console.warn('[Wolf.js] Distance attenuation values not properly initialized');
            return;
        }
        
        const wolfPosition = this.model.position;
        const distance = wolfPosition.distanceTo(listenerPosition);
        
        // Check if distance is valid
        if (!isFinite(distance) || distance < 0) {
            console.warn('[Wolf.js] Invalid distance calculated:', distance);
            return;
        }
        
        let volume = this.baseVolume;
        
        if (distance > this.effectiveDistance) {
            if (distance >= this.maxEffectiveDistance) {
                volume = 0; // Silent at max distance
            } else {
                // Linear interpolation between effectiveDistance and maxEffectiveDistance
                const fadeRange = this.maxEffectiveDistance - this.effectiveDistance;
                const fadePosition = distance - this.effectiveDistance;
                const fadeRatio = fadePosition / fadeRange;
                volume = this.baseVolume * (1 - fadeRatio);
            }
        }
        
        // Ensure volume is within bounds and is finite
        volume = Math.max(0, Math.min(this.baseVolume, volume));
        
        // Final safety check before setting volume
        if (!isFinite(volume) || volume < 0) {
            console.warn('[Wolf.js] Invalid volume calculated:', volume, 'using baseVolume instead');
            volume = this.baseVolume;
        }
        
        this.sound.setVolume(volume);
        
        // Debug logging (can be removed later)
        if (this.debugDistanceLogging) {
            console.log(`[Wolf.js] Distance: ${distance.toFixed(1)}m, Volume: ${volume.toFixed(3)}`);
        }
    }

    // Method to enable/disable distance logging
    setDistanceLogging(enabled) {
        this.debugDistanceLogging = enabled;
    }

    // Debug method to check distance system status
    checkDistanceSystem() {
        console.log('[Wolf.js] Distance System Status:', {
            hasSound: !!this.sound,
            hasModel: !!this.model,
            baseVolume: this.baseVolume,
            effectiveDistance: this.effectiveDistance,
            maxEffectiveDistance: this.maxEffectiveDistance,
            modelPosition: this.model ? this.model.position : 'No model',
            currentVolume: this.sound ? this.sound.getVolume() : 'No sound'
        });
        
        // Try to get camera position
        let cameraPosition = null;
        const camera = this.scene.getObjectByName('Camera') || this.scene.userData.camera;
        if (camera && camera.position) {
            cameraPosition = camera.position;
        } else {
            const view = this.scene.userData.view;
            if (view && view.camera && view.camera.instance && view.camera.instance.position) {
                cameraPosition = view.camera.instance.position;
            }
        }
        
        console.log('[Wolf.js] Camera Position:', cameraPosition);
        
        if (cameraPosition && this.model) {
            const distance = this.model.position.distanceTo(cameraPosition);
            console.log('[Wolf.js] Current Distance:', distance);
        }
    }

    // Method to update distance settings on the fly
    updateDistanceSettings(refDistance, maxDistance, rolloffFactor, distanceModel = 'linear') {
        if (this.sound && this.sound.panner) {
            console.log(`[Wolf.js] Updating distance settings:`, {
                refDistance, maxDistance, rolloffFactor, distanceModel
            });
            
            this.sound.setRefDistance(refDistance);
            this.sound.setMaxDistance(maxDistance);
            this.sound.setRolloffFactor(rolloffFactor);
            this.sound.panner.distanceModel = distanceModel;
            
            console.log(`[Wolf.js] New settings applied:`, {
                actualRefDistance: this.sound.panner.refDistance,
                actualMaxDistance: this.sound.panner.maxDistance,
                actualRolloffFactor: this.sound.panner.rolloffFactor,
                actualDistanceModel: this.sound.panner.distanceModel
            });
        }
    }

    // Test with different settings
    testSoundWithSettings(volume = 1.0, refDistance = 1, maxDistance = 1000, rolloffFactor = 1) {
        if (this.sound) {
            console.log('[Wolf.js] Testing sound with custom settings...');
            
            // Backup current settings
            const originalVolume = this.sound.getVolume();
            const originalRefDistance = this.sound.panner.refDistance;
            const originalMaxDistance = this.sound.panner.maxDistance;
            const originalRolloffFactor = this.sound.panner.rolloffFactor;
            
            // Apply test settings
            this.sound.setVolume(volume);
            this.sound.setRefDistance(refDistance);
            this.sound.setMaxDistance(maxDistance);
            this.sound.setRolloffFactor(rolloffFactor);
            
            console.log('[Wolf.js] Test settings applied:', { volume, refDistance, maxDistance, rolloffFactor });
            
            if (this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    this.sound.play();
                    // Restore original settings after test
                    setTimeout(() => {
                        this.sound.stop();
                        this.sound.setVolume(originalVolume);
                        this.sound.setRefDistance(originalRefDistance);
                        this.sound.setMaxDistance(originalMaxDistance);
                        this.sound.setRolloffFactor(originalRolloffFactor);
                        console.log('[Wolf.js] Original settings restored');
                    }, 3000);
                });
            } else {
                this.sound.play();
                // Restore original settings after test
                setTimeout(() => {
                    this.sound.stop();
                    this.sound.setVolume(originalVolume);
                    this.sound.setRefDistance(originalRefDistance);
                    this.sound.setMaxDistance(originalMaxDistance);
                    this.sound.setRolloffFactor(originalRolloffFactor);
                    console.log('[Wolf.js] Original settings restored');
                }, 3000);
            }
        } else {
            console.log('[Wolf.js] No sound object available for testing');
        }
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }

        // Update volume based on distance to camera
        if (this.sound && this.model) {
            let cameraPosition = null;
            
            // Try different ways to get camera position
            const camera = this.scene.getObjectByName('Camera') || this.scene.userData.camera;
            if (camera && camera.position) {
                cameraPosition = camera.position;
            } else {
                // Fallback: get camera from View instance
                const view = this.scene.userData.view;
                if (view && view.camera && view.camera.instance && view.camera.instance.position) {
                    cameraPosition = view.camera.instance.position;
                }
            }
            
            // Only update if we have a valid camera position
            if (cameraPosition && isFinite(cameraPosition.x) && isFinite(cameraPosition.y) && isFinite(cameraPosition.z)) {
                this.updateVolumeBasedOnDistance(cameraPosition);
            } else if (this.debugDistanceLogging) {
                console.warn('[Wolf.js] Could not get valid camera position for distance calculation');
            }
        }

        // Sound delay system
        if (this.sound && this.model) {
            const currentTime = Date.now();
            
            if (!this.isPlaying && currentTime - this.lastSoundTime > this.soundDelay) {
                console.log('[Wolf.js] Attempting to play wolf sound...');
                console.log('[Wolf.js] AudioListener context state:', this.audioListener.context.state);
                console.log('[Wolf.js] Sound isPlaying before play:', this.sound.isPlaying);
                
                // Check sound state before playing
                console.log('[Wolf.js] Sound state before play:', {
                    hasBuffer: !!this.sound.buffer,
                    volume: this.sound.getVolume(),
                    isPlaying: this.sound.isPlaying,
                    contextState: this.audioListener.context.state,
                    contextSampleRate: this.audioListener.context.sampleRate
                });

                // Try to resume audio context if suspended
                if (this.audioListener.context.state === 'suspended') {
                    console.log('[Wolf.js] Resuming suspended audio context...');
                    this.audioListener.context.resume().then(() => {
                        console.log('[Wolf.js] Audio context resumed, playing sound');
                        try {
                            this.sound.play();
                            console.log('[Wolf.js] Sound.play() called successfully');
                        } catch (error) {
                            console.error('[Wolf.js] Error calling sound.play():', error);
                        }
                    }).catch(error => {
                        console.error('[Wolf.js] Error resuming audio context:', error);
                    });
                } else {
                    try {
                        this.sound.play();
                        console.log('[Wolf.js] Sound.play() called successfully');
                    } catch (error) {
                        console.error('[Wolf.js] Error calling sound.play():', error);
                    }
                }
                
                this.isPlaying = true;
                this.lastSoundTime = currentTime;
                console.log('[Wolf.js] Sound play called, isPlaying after play:', this.sound.isPlaying);
                
                // Dừng sau soundDuration
                setTimeout(() => {
                    if (this.sound && this.isPlaying) {
                        console.log('[Wolf.js] Stopping wolf sound after duration');
                        this.sound.stop();
                        this.isPlaying = false;
                        // Random delay cho lần kế tiếp
                        if (this.soundConfig) {
                            this.soundDelay = this.soundConfig.delay.wolf + Math.random() * 1000;
                        } else {
                            this.soundDelay = 4000 + Math.random() * 3000;
                        }
                        console.log('[Wolf.js] Next sound delay set to:', this.soundDelay, 'ms');
                    }
                }, this.soundDuration);
            }
        }
    }
} 