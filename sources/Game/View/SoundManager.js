import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'
import Debug from '@/Debug/Debug.js'

export default class SoundManager
{
    static instance

    static getInstance()
    {
        return SoundManager.instance
    }

    constructor()
    {
        if(SoundManager.instance)
            return SoundManager.instance

        SoundManager.instance = this

        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()
        this.debug = Debug.getInstance()

        // Sound settings
        this.masterVolume = 0.5
        this.isMuted = false
        this.soundsEnabled = true

        this.sounds = {}
        this.listener = new THREE.AudioListener()
        this.audioLoader = new THREE.AudioLoader()

        // Add listener to camera
        this.view.camera.instance.add(this.listener)

        // Load sounds
        this.loadSounds()

        // Connect jump event
        this.state.player.controls.events.on('jumpDown', () => {
            this.playSound('jump')
        })

        // Add shortcut event
        window.addEventListener('keydown', (event) => {
            // M key to toggle sound
            if (event.code === 'KeyM') {
                this.toggleMute()
            }
        })

        // Add debug controls
        this.setDebug()
    }

    loadSounds()
    {
        // Jump sound
        this.createSound('jump', '/sounds/jump.mp3', { volume: 0.4 })
        
        // Landing sound
        this.createSound('land', '/sounds/land.mp3', { volume: 0.5 })
    }

    createSound(name, path, options = {})
    {
        const sound = new THREE.Audio(this.listener)
        
        this.sounds[name] = {
            sound: sound,
            loaded: false,
            path: path,
            options: Object.assign({
                volume: 0.5,
                loop: false
            }, options)
        }
        
        // Load sound
        this.audioLoader.load(
            path,
            (buffer) => {
                sound.setBuffer(buffer)
                sound.setVolume(this.sounds[name].options.volume * this.masterVolume)
                sound.setLoop(this.sounds[name].options.loop)
                this.sounds[name].loaded = true
                
                // If sound needs to play automatically
                if(this.sounds[name].options.autoplay && this.soundsEnabled && !this.isMuted) {
                    sound.play()
                }
            },
            () => {
                // Progress callback
            },
            (error) => {
                console.error('Cannot load sound file:', error)
            }
        )
        
        return sound
    }

    setDebug()
    {
        if(!this.debug.active)
            return
            
        const soundFolder = this.debug.ui.getFolder('audio/sound')
        
        soundFolder.add(this, 'masterVolume', 0, 1, 0.01)
            .name('Master volume')
            .onChange(() => {
                this.updateAllVolumes()
            })
            
        soundFolder.add(this, 'isMuted')
            .name('Mute')
            .onChange((value) => {
                if(value) {
                    this.muteAll()
                } else {
                    this.unmuteAll()
                }
            })
            
        soundFolder.add(this, 'soundsEnabled')
            .name('Enable sounds')
            
        // Create folder for each sound type
        const jumpFolder = soundFolder.addFolder('Âm thanh nhảy')
        if(this.sounds.jump) {
            jumpFolder.add(this.sounds.jump.options, 'volume', 0, 1, 0.01)
                .name('Jump volume')
                .onChange(() => {
                    if(this.sounds.jump.loaded) {
                        this.sounds.jump.sound.setVolume(
                            this.sounds.jump.options.volume * this.masterVolume
                        )
                    }
                })
        }
        
        const landFolder = soundFolder.addFolder('Landing sound')
        if(this.sounds.land) {
            landFolder.add(this.sounds.land.options, 'volume', 0, 1, 0.01)
                .name('Landing volume')
                .onChange(() => {
                    if(this.sounds.land.loaded) {
                        this.sounds.land.sound.setVolume(
                            this.sounds.land.options.volume * this.masterVolume
                        )
                    }
                })
        }
    }

    updateAllVolumes()
    {
        for(const [, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded) {
                soundObj.sound.setVolume(
                    soundObj.options.volume * this.masterVolume
                )
            }
        }
    }

    toggleMute()
    {
        this.isMuted = !this.isMuted
        
        if(this.isMuted) {
            this.muteAll()
            console.log('Sound is muted. Press M to unmute.')
        } else {
            this.unmuteAll()
            console.log('Sound is unmuted. Press M to mute.')
        }
    }

    muteAll()
    {
        for(const [, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded && soundObj.sound.isPlaying) {
                soundObj.sound.setVolume(0)
            }
        }
    }

    unmuteAll()
    {
        for(const [, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded) {
                soundObj.sound.setVolume(
                    soundObj.options.volume * this.masterVolume
                )
            }
        }
    }

    playSound(name)
    {
        if(!this.soundsEnabled || this.isMuted) {
            return
        }
        
        const soundObj = this.sounds[name]
        
        if(!soundObj) {
            console.warn(`Sound '${name}' does not exist`)
            return
        }
        
        if(!soundObj.loaded) {
            console.warn(`Sound '${name}' is not loaded`)
            return
        }
        
        // Play sound
        if(soundObj.sound.isPlaying) {
            soundObj.sound.stop()
        }
        
        soundObj.sound.setVolume(soundObj.options.volume * this.masterVolume)
        soundObj.sound.play()
    }

    stopSound(name)
    {
        const soundObj = this.sounds[name]
        
        if(!soundObj || !soundObj.loaded) {
            return
        }
        
        if(soundObj.sound.isPlaying) {
            soundObj.sound.stop()
        }
    }

    update()
    {
        // Can add 3D sound update logic for player position
    }
} 