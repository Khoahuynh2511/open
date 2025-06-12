import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import Debug from '@/Debug/Debug.js'
import State from '@/State/State.js'
import PlayerMaterial from './Materials/PlayerMaterial.js'
import CharacterManager from './CharacterManager.js'
import CharacterUI from './CharacterUI.js'
import CharacterEffects from './CharacterEffects.js'

export default class Player
{
    constructor()
    {
        this.game = Game.getInstance()
        this.state = State.getInstance()
        this.view = View.getInstance()
        this.debug = Debug.getInstance()

        this.scene = this.view.scene
        this.characterManager = new CharacterManager()
        this.characterEffects = new CharacterEffects(this.scene)

        this.setGroup()
        this.setHelper()
        this.setJumpEffects()
        this.setDebug()
        this.setCharacterUI()
    }

    setGroup()
    {
        this.group = new THREE.Group()
        this.scene.add(this.group)
    }
    
    setHelper()
    {
        this.createCharacterMesh()

        // const arrow = new THREE.Mesh(
        //     new THREE.ConeGeometry(0.2, 0.2, 4),
        //     new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false })
        // )
        // arrow.rotation.x = - Math.PI * 0.5
        // arrow.position.y = 1.5
        // arrow.position.z = - 0.5
        // this.helper.add(arrow)
        
        // // Axis helper
        // this.axisHelper = new THREE.AxesHelper(3)
        // this.group.add(this.axisHelper)
    }

    async createCharacterMesh()
    {
        // Remove old mesh if exists
        if (this.helper) {
            this.group.remove(this.helper)
            if (this.helper.geometry) this.helper.geometry.dispose()
            if (this.helper.material) this.helper.material.dispose()
        }

        // Get current character data
        const characterData = this.characterManager.getCharacterData()
        
        // Check if it's a model (online or local)
        if (characterData.isOnlineModel || characterData.isLocalModel) {
            try {
                console.log(`🔄 Loading model: ${characterData.name}`)
                console.log('📋 Model config:', {
                    isLocalModel: characterData.isLocalModel,
                    modelPath: characterData.modelPath,
                    scale: characterData.scale,
                    color: characterData.color
                })
                
                // Increase timeout for large models like Jaekelopterus
                const timeoutDuration = characterData.modelPath?.includes('Jaekelopterus') ? 15000 : 8000
                
                // Race between model loading and timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Timeout after ${timeoutDuration}ms`)), timeoutDuration)
                })
                
                let modelResult
                if (characterData.isLocalModel) {
                    // Load local model
                    console.log(`📁 Loading local model from: ${characterData.modelPath}`)
                    modelResult = await Promise.race([
                        this.characterManager.modelLoader.loadLocalModel(characterData.modelPath, characterData.name),
                        timeoutPromise
                    ])
                } else {
                    // Load online model (original code)
                    modelResult = await Promise.race([
                        this.characterManager.modelLoader.createModelGeometry(characterData.modelKey),
                        timeoutPromise
                    ])
                }
                
                if (modelResult && modelResult.isModel) {
                    // Use 3D model
                    this.helper = modelResult.object
                    this.helper.scale.set(characterData.scale.x, characterData.scale.y, characterData.scale.z)
                    
                    console.log('📏 Applied scale:', characterData.scale)
                    console.log('📦 Model bounding box:', new THREE.Box3().setFromObject(this.helper))
                    
                    // Debug preserveOriginalColor flag
                    console.log('🎨 preserveOriginalColor flag:', characterData.preserveOriginalColor)
                    
                    // Traverse through all meshes to apply color (optional)
                    if (!characterData.preserveOriginalColor) {
                        try {
                            console.log(`🎨 Applying custom color: ${characterData.color}`)
                            this.helper.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    console.log(`🎨 Applying color to mesh: ${child.name || 'unnamed'}`)
                                    
                                    // Create new material with selected color instead of just setting color
                                    const newMaterial = new THREE.MeshLambertMaterial({
                                        color: characterData.color,
                                        transparent: false
                                    })
                                    
                                    // If old material has texture, copy texture
                                    if (Array.isArray(child.material)) {
                                        child.material = child.material.map(mat => {
                                            const newMat = newMaterial.clone()
                                            if (mat.map) newMat.map = mat.map
                                            if (mat.normalMap) newMat.normalMap = mat.normalMap
                                            return newMat
                                        })
                                    } else {
                                        const newMat = newMaterial.clone()
                                        if (child.material.map) newMat.map = child.material.map
                                        if (child.material.normalMap) newMat.normalMap = child.material.normalMap
                                        child.material = newMat
                                    }
                                }
                            })
                        } catch (colorError) {
                            console.warn('Could not apply color to model:', colorError)
                        }
                    } else {
                        console.log('🌈 Preserving original model colors')
                    }
                    
                    this.group.add(this.helper)
                    console.log(`✅ Successfully loaded and added to scene: ${characterData.name}`)
                    return
                }
            } catch (error) {
                console.error(`❌ Failed to load model: ${characterData.name}`, error)
                console.log('📝 Error details:', {
                    message: error.message,
                    stack: error.stack,
                    modelPath: characterData.modelPath
                })
                // Fallback will be executed below
            }
        }
        
        // Fallback: Create mesh from geometry
        let geometry
        
        // If it's a model (online/local) and has fallback geometry, use fallback
        if ((characterData.isOnlineModel || characterData.isLocalModel) && characterData.fallbackGeometry) {
            console.log(`🔄 Using fallback geometry for: ${characterData.name}`)
            geometry = characterData.fallbackGeometry()
        } else if (characterData.geometry) {
            // Use standard geometry
            geometry = characterData.geometry()
        } else {
            // Default fallback
            console.warn('⚠️ No geometry found, using default capsule')
            geometry = new THREE.CapsuleGeometry(0.5, 0.8, 3, 16)
            geometry.translate(0, 0.9, 0)
        }
        
        // Check if geometry returns a Group (like new Son Goku)
        if (geometry instanceof THREE.Group) {
            this.helper = geometry
        } else {
            // Standard geometry
            this.helper = new THREE.Mesh()
            this.helper.material = new PlayerMaterial()
            this.helper.material.uniforms.uColor.value = new THREE.Color(characterData.color)
            this.helper.material.uniforms.uSunPosition.value = new THREE.Vector3(- 0.5, - 0.5, - 0.5)
            this.helper.geometry = geometry
        }
        
        this.helper.scale.set(characterData.scale.x, characterData.scale.y, characterData.scale.z)
        
        // Enable shadow casting for player
        if (this.helper instanceof THREE.Group) {
            this.helper.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true
                }
            })
        } else if (this.helper.isMesh) {
            this.helper.castShadow = true
        }
        
        this.group.add(this.helper)
    }

    async changeCharacter(characterType)
    {
        if (this.characterManager.setCharacterType(characterType)) {
            // Remove old effects
            this.characterEffects.removeAllEffects(this.helper)
            
            // Create new mesh (async)
            await this.createCharacterMesh()
            
            // Add effects for special characters
            this.characterEffects.addAura(this.helper, characterType)
            
            return true
        }
        return false
    }

    getAvailableCharacters()
    {
        return this.characterManager.getAvailableCharacters()
    }

    setCharacterUI()
    {
        this.characterUI = new CharacterUI(this)
    }

    setJumpEffects()
    {
        // Add effects for jumping
        this.jumpScale = {
            min: 0.9,
            max: 1.15
        }
        
        // Create dust effect when landing
        this.dustGeometry = new THREE.CircleGeometry(1, 12)
        this.dustGeometry.rotateX(-Math.PI / 2)
        
        this.dustMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        })
        
        this.dustEffect = new THREE.Mesh(this.dustGeometry, this.dustMaterial)
        this.dustEffect.position.y = 0.05
        this.dustEffect.scale.set(0, 0, 0)
        this.group.add(this.dustEffect)
        
        this.isShowingDust = false
        this.dustTime = 0
        this.dustDuration = 0.6
    }

    setDebug()
    {
        if(!this.debug.active)
            return

        // Player folder
        const playerFolder = this.debug.ui.getFolder('rendering/player')

        // Character Model Selection
        const characterFolder = playerFolder.addFolder('Character Model')
        
        // Get available characters for dropdown
        const availableCharacters = this.getAvailableCharacters()
        const characterOptions = {}
        availableCharacters.forEach(char => {
            characterOptions[char.name] = char.id
        })
        
        // Current character selector
        const characterSelector = {
            currentCharacter: this.characterManager.getCurrentCharacterType()
        }
        
        characterFolder.add(characterSelector, 'currentCharacter', characterOptions)
            .name('Character Model')
            .onChange(async (value) => {
                console.log(`🔄 Switching to character: ${value}`)
                try {
                    await this.changeCharacter(value)
                    console.log(`✅ Successfully changed to: ${value}`)
                } catch (error) {
                    console.error('❌ Failed to change character:', error)
                }
            })
        
        // Character Info Display
        const characterData = this.characterManager.getCharacterData()
        const infoDisplay = {
            name: characterData.name,
            type: characterData.isLocalModel ? 'Local Model' : 
                  characterData.isOnlineModel ? 'Online Model' : 'Geometry',
            preserveColor: characterData.preserveOriginalColor || false
        }
        
        characterFolder.add(infoDisplay, 'name').name('Current Name').listen()
        characterFolder.add(infoDisplay, 'type').name('Model Type').listen()
        characterFolder.add(infoDisplay, 'preserveColor').name('Original Colors').listen()
        
        // Scale Controls
        const scaleFolder = characterFolder.addFolder('Scale')
        const scaleControls = {
            x: characterData.scale.x,
            y: characterData.scale.y,
            z: characterData.scale.z,
            uniform: 1.0
        }
        
        scaleFolder.add(scaleControls, 'x', 0.1, 3.0, 0.1).name('Scale X').onChange((value) => {
            if (this.helper) {
                this.helper.scale.x = value
                this.characterManager.getCharacterData().scale.x = value
            }
        })
        
        scaleFolder.add(scaleControls, 'y', 0.1, 3.0, 0.1).name('Scale Y').onChange((value) => {
            if (this.helper) {
                this.helper.scale.y = value
                this.characterManager.getCharacterData().scale.y = value
            }
        })
        
        scaleFolder.add(scaleControls, 'z', 0.1, 3.0, 0.1).name('Scale Z').onChange((value) => {
            if (this.helper) {
                this.helper.scale.z = value
                this.characterManager.getCharacterData().scale.z = value
            }
        })
        
        scaleFolder.add(scaleControls, 'uniform', 0.1, 3.0, 0.1).name('Uniform Scale').onChange((value) => {
            scaleControls.x = value
            scaleControls.y = value
            scaleControls.z = value
            if (this.helper) {
                this.helper.scale.set(value, value, value)
                const charData = this.characterManager.getCharacterData()
                charData.scale.x = value
                charData.scale.y = value
                charData.scale.z = value
            }
        })
        
        // Color control (only for non-preserved colors)
        if (this.helper.material && this.helper.material.uniforms && this.helper.material.uniforms.uColor) {
            const colorFolder = characterFolder.addFolder('Color')
            colorFolder.addColor(this.helper.material.uniforms.uColor, 'value').name('Player Color')
        }
        
        // Quick Actions
        const actionsFolder = characterFolder.addFolder('Quick Actions')
        
        actionsFolder.add({
            resetScale: () => {
                const originalData = this.characterManager.characters[this.characterManager.getCurrentCharacterType()]
                if (originalData && this.helper) {
                    this.helper.scale.set(originalData.scale.x, originalData.scale.y, originalData.scale.z)
                    scaleControls.x = originalData.scale.x
                    scaleControls.y = originalData.scale.y
                    scaleControls.z = originalData.scale.z
                    scaleControls.uniform = originalData.scale.x
                }
            }
        }, 'resetScale').name('Reset Scale')
        
        actionsFolder.add({
            reloadModel: async () => {
                console.log('🔄 Reloading current character model...')
                await this.createCharacterMesh()
                console.log('✅ Model reloaded successfully')
            }
        }, 'reloadModel').name('Reload Model')
        
        // Model List Info
        const modelListFolder = characterFolder.addFolder('Available Models')
        availableCharacters.forEach((char, index) => {
            const modelInfo = this.characterManager.getCharacterData(char.id)
            const modelType = modelInfo.isLocalModel ? '📁 Local' : 
                             modelInfo.isOnlineModel ? '🌐 Online' : '🔷 Geometry'
            
            modelListFolder.add({
                info: `${modelType} - ${char.name}`
            }, 'info').name(`${index + 1}. ${char.id}`)
        })
    }


    update()
    {
        const playerState = this.state.player
        const sunState = this.state.sun

        this.group.position.set(
            playerState.position.current[0],
            playerState.position.current[1],
            playerState.position.current[2]
        )
        
        // Rotate model according to movement direction
        if (this.helper) {
            const characterData = this.characterManager.getCharacterData()
            
            if (characterData.isLocalModel || characterData.isOnlineModel) {
                // Use rotationOffset from model config
                const rotationOffset = characterData.rotationOffset || Math.PI
                this.helper.rotation.y = playerState.rotation + rotationOffset
                // console.log(`🔄 Rotating 3D model: ${(playerState.rotation * 180 / Math.PI).toFixed(1)}° + offset: ${(rotationOffset * 180 / Math.PI).toFixed(1)}°`)
            } else {
                this.helper.rotation.y = playerState.rotation
            }
        }
        
        if (this.helper.material && this.helper.material.uniforms) {
            this.helper.material.uniforms.uSunPosition.value.set(sunState.position.x, sunState.position.y, sunState.position.z)
        }
        
        // Jump effect
        if(playerState.isJumping)
        {
            // Scaling animation when jumping
            const jumpProgress = playerState.jumpTime / playerState.jumpDuration
            const jumpScaleValue = this.jumpScale.min + Math.sin(jumpProgress * Math.PI) * (this.jumpScale.max - this.jumpScale.min)
            
            // Extend when jumping, compress when landing
            this.helper.scale.y = 2 - jumpScaleValue
            this.helper.scale.x = jumpScaleValue
            this.helper.scale.z = jumpScaleValue
            
            // Set dust effect when landing
            if(jumpProgress > 0.8 && !this.isShowingDust)
            {
                this.isShowingDust = true
            }
        }
        else
        {
            // Về kích thước bình thường khi không nhảy
            const characterData = this.characterManager.getCharacterData()
            this.helper.scale.set(characterData.scale.x, characterData.scale.y, characterData.scale.z)
            
            // Show dust effect when landing
            if(this.isShowingDust)
            {
                this.dustTime += this.state.time.delta
                
                if(this.dustTime < this.dustDuration)
                {
                    const progress = this.dustTime / this.dustDuration
                    const size = progress * 2
                    const opacity = Math.sin(progress * Math.PI) * 0.5
                    
                    this.dustEffect.scale.set(size, size, size)
                    this.dustMaterial.opacity = opacity
                }
                else
                {
                    this.isShowingDust = false
                    this.dustTime = 0
                    this.dustEffect.scale.set(0, 0, 0)
                    this.dustMaterial.opacity = 0
                }
            }
        }


        this.characterEffects.update(this.state.time.delta, this.helper)
    }
}
