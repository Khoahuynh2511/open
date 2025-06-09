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
        // Xóa mesh cũ nếu có
        if (this.helper) {
            this.group.remove(this.helper)
            if (this.helper.geometry) this.helper.geometry.dispose()
            if (this.helper.material) this.helper.material.dispose()
        }

        // Lấy dữ liệu nhân vật hiện tại
        const characterData = this.characterManager.getCharacterData()
        
        // Kiểm tra nếu là model (online hoặc local)
        if (characterData.isOnlineModel || characterData.isLocalModel) {
            try {
                console.log(`🔄 Loading model: ${characterData.name}`)
                console.log(`📋 Model config:`, {
                    isLocalModel: characterData.isLocalModel,
                    modelPath: characterData.modelPath,
                    scale: characterData.scale,
                    color: characterData.color
                })
                
                // Tăng timeout cho model lớn như Jaekelopterus
                const timeoutDuration = characterData.modelPath?.includes('Jaekelopterus') ? 15000 : 8000
                
                // Race between model loading và timeout
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
                    // Sử dụng model 3D
                    this.helper = modelResult.object
                    this.helper.scale.set(characterData.scale.x, characterData.scale.y, characterData.scale.z)
                    
                    console.log(`📏 Applied scale:`, characterData.scale)
                    console.log(`📦 Model bounding box:`, new THREE.Box3().setFromObject(this.helper))
                    
                    // Debug preserveOriginalColor flag
                    console.log(`🎨 preserveOriginalColor flag:`, characterData.preserveOriginalColor)
                    
                    // Traverse qua tất cả mesh để apply màu (optional)
                    if (!characterData.preserveOriginalColor) {
                        try {
                            console.log(`🎨 Applying custom color: ${characterData.color}`)
                            this.helper.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    console.log(`🎨 Applying color to mesh: ${child.name || 'unnamed'}`)
                                    
                                    // Tạo material mới với màu đã chọn thay vì chỉ set color
                                    const newMaterial = new THREE.MeshLambertMaterial({
                                        color: characterData.color,
                                        transparent: false
                                    })
                                    
                                    // Nếu material cũ có texture, sao chép texture
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
                        console.log(`🌈 Preserving original model colors`)
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
                // Fallback sẽ được thực hiện ở dưới
            }
        }
        
        // Fallback: Tạo mesh từ geometry
        let geometry
        
        // Nếu là model (online/local) và có fallback geometry, dùng fallback
        if ((characterData.isOnlineModel || characterData.isLocalModel) && characterData.fallbackGeometry) {
            console.log(`🔄 Using fallback geometry for: ${characterData.name}`)
            geometry = characterData.fallbackGeometry()
        } else if (characterData.geometry) {
            // Dùng geometry thông thường
            geometry = characterData.geometry()
        } else {
            // Default fallback
            console.warn(`⚠️ No geometry found, using default capsule`)
            geometry = new THREE.CapsuleGeometry(0.5, 0.8, 3, 16)
            geometry.translate(0, 0.9, 0)
        }
        
        // Kiểm tra nếu geometry trả về là Group (như Son Goku mới)
        if (geometry instanceof THREE.Group) {
            this.helper = geometry
        } else {
            // Geometry thông thường
            this.helper = new THREE.Mesh()
            this.helper.material = new PlayerMaterial()
            this.helper.material.uniforms.uColor.value = new THREE.Color(characterData.color)
            this.helper.material.uniforms.uSunPosition.value = new THREE.Vector3(- 0.5, - 0.5, - 0.5)
            this.helper.geometry = geometry
        }
        
        this.helper.scale.set(characterData.scale.x, characterData.scale.y, characterData.scale.z)
        this.group.add(this.helper)
    }

    async changeCharacter(characterType)
    {
        if (this.characterManager.setCharacterType(characterType)) {
            // Xóa hiệu ứng cũ
            this.characterEffects.removeAllEffects(this.helper)
            
            // Tạo mesh mới (async)
            await this.createCharacterMesh()
            
            // Thêm hiệu ứng cho nhân vật đặc biệt
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
        // Thêm hiệu ứng cho phần nhảy
        this.jumpScale = {
            min: 0.9,
            max: 1.15
        }
        
        // Tạo hiệu ứng bụi khi hạ cánh
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

        // Sphere
        const playerFolder = this.debug.ui.getFolder('view/player')

        playerFolder.addColor(this.helper.material.uniforms.uColor, 'value')
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
        
        // Quay model theo hướng di chuyển
        if (this.helper) {
            // Đối với model 3D GLTF, có thể cần điều chỉnh hướng
            const characterData = this.characterManager.getCharacterData()
            
            if (characterData.isLocalModel || characterData.isOnlineModel) {
                // Sử dụng rotationOffset từ config model
                const rotationOffset = characterData.rotationOffset || Math.PI
                this.helper.rotation.y = playerState.rotation + rotationOffset
                // console.log(`🔄 Rotating 3D model: ${(playerState.rotation * 180 / Math.PI).toFixed(1)}° + offset: ${(rotationOffset * 180 / Math.PI).toFixed(1)}°`)
            } else {
                // Geometry thông thường
                this.helper.rotation.y = playerState.rotation
            }
        }
        
        // Chỉ update material nếu không phải là 3D model
        if (this.helper.material && this.helper.material.uniforms) {
            this.helper.material.uniforms.uSunPosition.value.set(sunState.position.x, sunState.position.y, sunState.position.z)
        }
        
        // Hiệu ứng nhảy
        if(playerState.isJumping)
        {
            // Scaling animation khi nhảy
            const jumpProgress = playerState.jumpTime / playerState.jumpDuration
            const jumpScaleValue = this.jumpScale.min + Math.sin(jumpProgress * Math.PI) * (this.jumpScale.max - this.jumpScale.min)
            
            // Kéo dài khi bắt đầu nhảy, nén lại khi hạ cánh
            this.helper.scale.y = 2 - jumpScaleValue
            this.helper.scale.x = jumpScaleValue
            this.helper.scale.z = jumpScaleValue
            
            // Thiết lập hiệu ứng bụi khi kết thúc nhảy
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
            
            // Hiển thị hiệu ứng bụi khi hạ cánh
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

        // Cập nhật hiệu ứng nhân vật đặc biệt
        this.characterEffects.update(this.state.time.delta, this.helper)
    }
}
