import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Cow {
    constructor(scene, time, initialPosition, audioListener, enableSound, soundConfig = null) {
        console.log('[Cow.js] Constructor started for cow at', initialPosition)
        this.scene = scene
        this.time = time
        this.initialPosition = initialPosition
        this.audioListener = audioListener
        this.sound = null
        this.enableSoundOnLoad = enableSound

        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        // Sound delay system - sử dụng soundConfig nếu có
        if (soundConfig) {
            this.soundDelay = soundConfig.delay.cow + Math.random() * 2000 // Thêm random 0-2 giây
            this.soundDuration = soundConfig.duration.cow
            this.soundConfig = soundConfig
        } else {
            this.soundDelay = 3000 + Math.random() * 2000 // 3-5 giây delay với random
            this.soundDuration = 2000 // Kêu trong 2 giây
        }
        this.lastSoundTime = 0
        this.isPlaying = false

        this.loadModel()
        console.log('[Cow.js] Constructor finished, loadModel called')
    }

    loadModel() {
        console.log('[Cow.js] loadModel started')
        this.gltfLoader.load(
            '/models/animals/Cow.glb',
            (gltf) => {
                console.log('[Cow.js] Model loaded successfully:', gltf)
                this.model = gltf.scene
                this.model.scale.set(0.8, 0.8, 0.8)
                this.model.position.copy(this.initialPosition)
                this.model.rotation.y = Math.random() * Math.PI * 2
                this.scene.add(this.model)
                console.log('[Cow.js] Model added to scene at', this.initialPosition)

                this.model.traverse((child) => {
                    if (child.isMesh) {
                        console.log('[Cow.js] Mesh found:', child.name, 'Material:', child.material)
                        if (child.material && child.material.map) {
                            console.log('[Cow.js] Texture map found on material:', child.material.map)
                        } else if (child.material) {
                            console.log('[Cow.js] No texture map on material:', child.material.name || child.material.uuid)
                        } else {
                            console.log('[Cow.js] Mesh has no material.')
                        }
                    }
                })

                if (gltf.animations && gltf.animations.length) {
                    console.log('[Cow.js] Animations found:', gltf.animations)
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0])
                    action.play()
                    console.log('[Cow.js] Animation started')
                } else {
                    console.log('[Cow.js] No animations found in model')
                }
                
                if (this.enableSoundOnLoad) {
                    this.enableSound()
                }
            },
            undefined,
            (error) => {
                console.error('[Cow.js] An error happened while loading the cow model:', error)
            }
        )
    }

    enableSound() {
        console.log('[Cow.js] enableSound called')
        if (this.sound) {
            this.model.remove(this.sound)
            this.sound.stop()
            this.sound = null
        }
        if (!this.audioListener) {
            console.warn('[Cow.js] No audioListener available')
            return
        }
        if (!this.model) {
            console.warn('[Cow.js] No model available')
            return
        }
        
        console.log('[Cow.js] AudioListener context state:', this.audioListener.context.state)
        
        const audioLoader = new THREE.AudioLoader()
        this.sound = new THREE.PositionalAudio(this.audioListener)
        
        audioLoader.load('/sounds/cow.mp3', (buffer) => {
            console.log('[Cow.js] Sound buffer loaded successfully:', buffer)
            console.log('[Cow.js] Buffer details - Duration:', buffer.duration, 'Sample Rate:', buffer.sampleRate, 'Channels:', buffer.numberOfChannels)
            
            this.sound.setBuffer(buffer)
            
            // DISABLE THREE.JS DISTANCE ATTENUATION - WE'LL HANDLE IT MANUALLY
            this.sound.setDistanceModel('linear')
            this.sound.setRefDistance(10000) // Very high ref distance
            this.sound.setRolloffFactor(0)   // No automatic rolloff
            this.sound.setMaxDistance(20000) // Very high max distance
            
            // Store base volume and distance settings for manual calculation
            if (this.soundConfig) {
                this.baseVolume = this.soundConfig.volume.cow || 0.3
                this.effectiveDistance = this.soundConfig.refDistance.cow || 15
                this.maxEffectiveDistance = this.soundConfig.maxDistance.cow || 50
            } else {
                this.baseVolume = 0.3
                this.effectiveDistance = 15 // Distance at which volume starts to decrease
                this.maxEffectiveDistance = 50 // Distance at which volume becomes 0
            }
            
            // Validate values
            this.baseVolume = isFinite(this.baseVolume) && this.baseVolume > 0 ? this.baseVolume : 0.3
            this.effectiveDistance = isFinite(this.effectiveDistance) && this.effectiveDistance > 0 ? this.effectiveDistance : 15
            this.maxEffectiveDistance = isFinite(this.maxEffectiveDistance) && this.maxEffectiveDistance > this.effectiveDistance ? this.maxEffectiveDistance : this.effectiveDistance + 35
            
            this.sound.setVolume(this.baseVolume) // Set initial volume
            
            console.log('[Cow.js] Custom distance attenuation enabled - BaseVolume:', this.baseVolume, 'EffectiveDistance:', this.effectiveDistance, 'MaxDistance:', this.maxEffectiveDistance)
            
            this.sound.setLoop(false)        // Không loop liên tục
            
            // Check audio context properties
            console.log('[Cow.js] Audio context sample rate:', this.audioListener.context.sampleRate)
            console.log('[Cow.js] Audio context state:', this.audioListener.context.state)
            console.log('[Cow.js] Sound setup completed for cow')
        }, (progress) => {
            console.log('[Cow.js] Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%')
        }, (error) => {
            console.error('[Cow.js] Failed to load sound:', error)
        })
        this.model.add(this.sound)
    }

    disableSound() {
        if (this.sound) {
            this.sound.stop()
            this.model.remove(this.sound)
            this.sound = null
        }
    }

    // Test method để kiểm tra sound ngay lập tức
    testSound() {
        if (this.sound) {
            console.log('[Cow.js] Testing sound immediately...')
            console.log('[Cow.js] Sound buffer:', this.sound.buffer)
            console.log('[Cow.js] Sound volume:', this.sound.getVolume())
            console.log('[Cow.js] Audio context state:', this.audioListener.context.state)
            console.log('[Cow.js] Distance model:', this.sound.panner.distanceModel)
            console.log('[Cow.js] Ref distance:', this.sound.panner.refDistance)
            console.log('[Cow.js] Max distance:', this.sound.panner.maxDistance)
            console.log('[Cow.js] Rolloff factor:', this.sound.panner.rolloffFactor)
            
            if (this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    console.log('[Cow.js] Audio context resumed for test')
                    this.sound.play()
                    setTimeout(() => this.sound.stop(), 2000)
                })
            } else {
                this.sound.play()
                setTimeout(() => this.sound.stop(), 2000)
            }
        } else {
            console.log('[Cow.js] No sound object available for testing')
        }
    }

    // Method to calculate custom distance attenuation
    updateVolumeBasedOnDistance(listenerPosition) {
        if (!this.sound || !this.model || !listenerPosition) return
        
        // Safety checks for required values
        if (!this.baseVolume || !this.effectiveDistance || !this.maxEffectiveDistance) {
            console.warn('[Cow.js] Distance attenuation values not properly initialized')
            return
        }
        
        const cowPosition = this.model.position
        const distance = cowPosition.distanceTo(listenerPosition)
        
        // Check if distance is valid
        if (!isFinite(distance) || distance < 0) {
            console.warn('[Cow.js] Invalid distance calculated:', distance)
            return
        }
        
        let volume = this.baseVolume
        
        if (distance > this.effectiveDistance) {
            if (distance >= this.maxEffectiveDistance) {
                volume = 0 // Silent at max distance
            } else {
                // Linear interpolation between effectiveDistance and maxEffectiveDistance
                const fadeRange = this.maxEffectiveDistance - this.effectiveDistance
                const fadePosition = distance - this.effectiveDistance
                const fadeRatio = fadePosition / fadeRange
                volume = this.baseVolume * (1 - fadeRatio)
            }
        }
        
        // Ensure volume is within bounds and is finite
        volume = Math.max(0, Math.min(this.baseVolume, volume))
        
        // Final safety check before setting volume
        if (!isFinite(volume) || volume < 0) {
            console.warn('[Cow.js] Invalid volume calculated:', volume, 'using baseVolume instead')
            volume = this.baseVolume
        }
        
        this.sound.setVolume(volume)
        
        // Debug logging (can be removed later)
        if (this.debugDistanceLogging) {
            console.log(`[Cow.js] Distance: ${distance.toFixed(1)}m, Volume: ${volume.toFixed(3)}`)
        }
    }

    // Method to enable/disable distance logging
    setDistanceLogging(enabled) {
        this.debugDistanceLogging = enabled
    }

    // Debug method to check distance system status
    checkDistanceSystem() {
        console.log('[Cow.js] Distance System Status:', {
            hasSound: !!this.sound,
            hasModel: !!this.model,
            baseVolume: this.baseVolume,
            effectiveDistance: this.effectiveDistance,
            maxEffectiveDistance: this.maxEffectiveDistance,
            modelPosition: this.model ? this.model.position : 'No model',
            currentVolume: this.sound ? this.sound.getVolume() : 'No sound'
        })
        
        // Try to get camera position
        let cameraPosition = null
        const camera = this.scene.getObjectByName('Camera') || this.scene.userData.camera
        if (camera && camera.position) {
            cameraPosition = camera.position
        } else {
            const view = this.scene.userData.view
            if (view && view.camera && view.camera.instance && view.camera.instance.position) {
                cameraPosition = view.camera.instance.position
            }
        }
        
        console.log('[Cow.js] Camera Position:', cameraPosition)
        
        if (cameraPosition && this.model) {
            const distance = this.model.position.distanceTo(cameraPosition)
            console.log('[Cow.js] Current Distance:', distance)
        }
    }

    // Method to update distance settings on the fly
    updateDistanceSettings(refDistance, maxDistance, rolloffFactor, distanceModel = 'linear') {
        if (this.sound && this.sound.panner) {
            console.log('[Cow.js] Updating distance settings:', {
                refDistance, maxDistance, rolloffFactor, distanceModel
            })
            
            this.sound.setRefDistance(refDistance)
            this.sound.setMaxDistance(maxDistance)
            this.sound.setRolloffFactor(rolloffFactor)
            this.sound.panner.distanceModel = distanceModel
            
            console.log('[Cow.js] New settings applied:', {
                actualRefDistance: this.sound.panner.refDistance,
                actualMaxDistance: this.sound.panner.maxDistance,
                actualRolloffFactor: this.sound.panner.rolloffFactor,
                actualDistanceModel: this.sound.panner.distanceModel
            })
        }
    }

    // Test method using standard Audio instead of PositionalAudio
    testWithStandardAudio() {
        console.log('[Cow.js] Testing with standard THREE.Audio instead of PositionalAudio...')
        
        if (!this.audioListener) {
            console.warn('[Cow.js] No audioListener available')
            return
        }
        
        const audioLoader = new THREE.AudioLoader()
        const standardAudio = new THREE.Audio(this.audioListener) // Standard Audio instead of PositionalAudio
        
        audioLoader.load('/sounds/cow.mp3', (buffer) => {
            console.log('[Cow.js] Standard audio buffer loaded')
            standardAudio.setBuffer(buffer)
            standardAudio.setVolume(0.3)
            standardAudio.setLoop(false)
            
            if (this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    standardAudio.play()
                    setTimeout(() => {
                        standardAudio.stop()
                        console.log('[Cow.js] Standard audio test completed')
                    }, 2000)
                })
            } else {
                standardAudio.play()
                setTimeout(() => {
                    standardAudio.stop()
                    console.log('[Cow.js] Standard audio test completed')
                }, 2000)
            }
        }, undefined, (error) => {
            console.error('[Cow.js] Failed to load sound for standard audio test:', error)
        })
    }

    // Test with different settings
    testSoundWithSettings(volume = 1.0, refDistance = 1, maxDistance = 1000, rolloffFactor = 1) {
        if (this.sound) {
            console.log('[Cow.js] Testing sound with custom settings...')
            
            // Backup current settings
            const originalVolume = this.sound.getVolume()
            const originalRefDistance = this.sound.panner.refDistance
            const originalMaxDistance = this.sound.panner.maxDistance
            const originalRolloffFactor = this.sound.panner.rolloffFactor
            
            // Apply test settings
            this.sound.setVolume(volume)
            this.sound.setRefDistance(refDistance)
            this.sound.setMaxDistance(maxDistance)
            this.sound.setRolloffFactor(rolloffFactor)
            
            console.log('[Cow.js] Test settings applied:', { volume, refDistance, maxDistance, rolloffFactor })
            
            if (this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume().then(() => {
                    this.sound.play()
                    // Restore original settings after test
                    setTimeout(() => {
                        this.sound.stop()
                        this.sound.setVolume(originalVolume)
                        this.sound.setRefDistance(originalRefDistance)
                        this.sound.setMaxDistance(originalMaxDistance)
                        this.sound.setRolloffFactor(originalRolloffFactor)
                        console.log('[Cow.js] Original settings restored')
                    }, 3000)
                })
            } else {
                this.sound.play()
                // Restore original settings after test
                setTimeout(() => {
                    this.sound.stop()
                    this.sound.setVolume(originalVolume)
                    this.sound.setRefDistance(originalRefDistance)
                    this.sound.setMaxDistance(originalMaxDistance)
                    this.sound.setRolloffFactor(originalRolloffFactor)
                    console.log('[Cow.js] Original settings restored')
                }, 3000)
            }
        } else {
            console.log('[Cow.js] No sound object available for testing')
        }
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }

        // Update volume based on distance to camera
        if (this.sound && this.model) {
            let cameraPosition = null
            
            // Try different ways to get camera position
            const camera = this.scene.getObjectByName('Camera') || this.scene.userData.camera
            if (camera && camera.position) {
                cameraPosition = camera.position
            } else {
                // Fallback: get camera from View instance
                const view = this.scene.userData.view
                if (view && view.camera && view.camera.instance && view.camera.instance.position) {
                    cameraPosition = view.camera.instance.position
                }
            }
            
            // Only update if we have a valid camera position
            if (cameraPosition && isFinite(cameraPosition.x) && isFinite(cameraPosition.y) && isFinite(cameraPosition.z)) {
                this.updateVolumeBasedOnDistance(cameraPosition)
            } else if (this.debugDistanceLogging) {
                console.warn('[Cow.js] Could not get valid camera position for distance calculation')
            }
        }

        // Sound delay system
        if (this.sound && this.model) {
            const currentTime = Date.now()
            
            if (!this.isPlaying && currentTime - this.lastSoundTime > this.soundDelay) {
                console.log('[Cow.js] Attempting to play cow sound...')
                console.log('[Cow.js] AudioListener context state:', this.audioListener.context.state)
                console.log('[Cow.js] Sound isPlaying before play:', this.sound.isPlaying)
                
                // Check sound state before playing
                console.log('[Cow.js] Sound state before play:', {
                    hasBuffer: !!this.sound.buffer,
                    volume: this.sound.getVolume(),
                    isPlaying: this.sound.isPlaying,
                    contextState: this.audioListener.context.state,
                    contextSampleRate: this.audioListener.context.sampleRate
                })

                // Try to resume audio context if suspended
                if (this.audioListener.context.state === 'suspended') {
                    console.log('[Cow.js] Resuming suspended audio context...')
                    this.audioListener.context.resume().then(() => {
                        console.log('[Cow.js] Audio context resumed, playing sound')
                        try {
                            this.sound.play()
                            console.log('[Cow.js] Sound.play() called successfully')
                        } catch (error) {
                            console.error('[Cow.js] Error calling sound.play():', error)
                        }
                    }).catch(error => {
                        console.error('[Cow.js] Error resuming audio context:', error)
                    })
                } else {
                    try {
                        this.sound.play()
                        console.log('[Cow.js] Sound.play() called successfully')
                    } catch (error) {
                        console.error('[Cow.js] Error calling sound.play():', error)
                    }
                }
                
                this.isPlaying = true
                this.lastSoundTime = currentTime
                console.log('[Cow.js] Sound play called, isPlaying after play:', this.sound.isPlaying)
                
                // Dừng sau soundDuration
                setTimeout(() => {
                    if (this.sound && this.isPlaying) {
                        console.log('[Cow.js] Stopping cow sound after duration')
                        this.sound.stop()
                        this.isPlaying = false
                        // Random delay cho lần kế tiếp
                        if (this.soundConfig) {
                            this.soundDelay = this.soundConfig.delay.cow + Math.random() * 2000
                        } else {
                            this.soundDelay = 3000 + Math.random() * 2000
                        }
                        console.log('[Cow.js] Next sound delay set to:', this.soundDelay, 'ms')
                    }
                }, this.soundDuration)
            }
        }

        // if (this.model) {
        //     this.model.position.x += 0.01 * Math.sin(this.time.elapsed * 0.5);
        // }
    }
} 