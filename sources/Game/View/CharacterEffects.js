import * as THREE from 'three'

export default class CharacterEffects
{
    constructor(scene)
    {
        this.scene = scene
        this.effects = new Map()
        this.time = 0
    }

    addAura(characterMesh, characterType)
    {
        this.removeEffect(characterMesh, 'aura')

        // Tạm thời bỏ hiệu ứng để tránh lỗi
        // Sẽ thêm lại khi có model
        console.log(`🌟 Character selected: ${characterType}`)
        
        /* 
        switch(characterType) {
            case 'goku_3d':
                this.createSaiyanAura(characterMesh)
                break
            case 'robot_3d':
                this.createRobotAura(characterMesh)
                break
        }
        */
    }

    createSaiyanAura(characterMesh)
    {
        // Tạo aura vàng Super Saiyan
        const auraGeometry = new THREE.SphereGeometry(1.2, 16, 16)
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: '#ffeb3b',
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        })
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial)
        aura.position.copy(characterMesh.position)
        
        this.scene.add(aura)
        this.setEffect(characterMesh, 'aura', {
            group: aura,
            type: 'saiyan'
        })
    }

    createChakraAura(characterMesh)
    {
        // Aura chakra màu cam xoay
        const auraGeometry = new THREE.TorusGeometry(1, 0.2, 8, 16)
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: '#ff5722',
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        })
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial)
        aura.position.copy(characterMesh.position)
        
        this.scene.add(aura)
        this.setEffect(characterMesh, 'aura', {
            group: aura,
            type: 'chakra'
        })
    }

    createElectricAura(characterMesh)
    {
        // Hiệu ứng điện quanh Pikachu
        const sparkCount = 15
        const sparkGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(sparkCount * 3)
        
        for(let i = 0; i < sparkCount * 3; i += 3) {
            const radius = 1 + Math.random() * 0.5
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta)
            positions[i + 1] = radius * Math.cos(phi) + 1
            positions[i + 2] = radius * Math.sin(phi) * Math.sin(theta)
        }
        
        sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        const sparkMaterial = new THREE.PointsMaterial({
            color: '#ffeb3b',
            size: 0.08,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        })
        
        const sparks = new THREE.Points(sparkGeometry, sparkMaterial)
        
        this.scene.add(sparks)
        this.setEffect(characterMesh, 'aura', {
            group: sparks,
            type: 'electric'
        })
    }

    setEffect(characterMesh, effectType, effectData)
    {
        if (!this.effects.has(characterMesh)) {
            this.effects.set(characterMesh, new Map())
        }
        this.effects.get(characterMesh).set(effectType, effectData)
    }

    getEffect(characterMesh, effectType)
    {
        if (this.effects.has(characterMesh)) {
            return this.effects.get(characterMesh).get(effectType)
        }
        return null
    }

    removeEffect(characterMesh, effectType)
    {
        const effect = this.getEffect(characterMesh, effectType)
        if (effect) {
            if (effect.group) {
                this.scene.remove(effect.group)
                if (effect.group.geometry) effect.group.geometry.dispose()
                if (effect.group.material) effect.group.material.dispose()
            }
            
            if (this.effects.has(characterMesh)) {
                this.effects.get(characterMesh).delete(effectType)
            }
        }
    }

    removeAllEffects(characterMesh)
    {
        if (this.effects.has(characterMesh)) {
            const characterEffects = this.effects.get(characterMesh)
            for (const [effectType, effectData] of characterEffects) {
                this.removeEffect(characterMesh, effectType)
            }
            this.effects.delete(characterMesh)
        }
    }

    update(deltaTime, characterMesh)
    {
        this.time += deltaTime

        // Update animations for each effect
        if (this.effects.has(characterMesh)) {
            const characterEffects = this.effects.get(characterMesh)
            
            for (const [effectType, effectData] of characterEffects) {
                this.updateEffect(effectData, characterMesh)
            }
        }
    }

    updateEffect(effectData, characterMesh)
    {
        if (!effectData.group) return

        // Update position to follow character
        if (effectData.group.position) {
            effectData.group.position.copy(characterMesh.position)
        }

        switch(effectData.type) {
            case 'saiyan':
                // Pulse aura
                const pulse = 1 + Math.sin(this.time * 3) * 0.1
                effectData.group.scale.set(pulse, pulse, pulse)
                effectData.group.material.opacity = 0.1 + Math.sin(this.time * 2) * 0.05
                break

            case 'chakra':
                // Rotate chakra rings
                effectData.group.rotation.y += 0.05
                effectData.group.rotation.x = Math.sin(this.time) * 0.2
                break

            case 'electric':
                // Random spark movement
                const positions = effectData.group.geometry.attributes.position.array
                for(let i = 0; i < positions.length; i += 3) {
                    positions[i] += (Math.random() - 0.5) * 0.02
                    positions[i + 2] += (Math.random() - 0.5) * 0.02
                }
                effectData.group.geometry.attributes.position.needsUpdate = true
                break
        }
    }
}
