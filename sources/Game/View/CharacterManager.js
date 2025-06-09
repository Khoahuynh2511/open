import * as THREE from 'three'
import ModelLoader from './ModelLoader.js'

export default class CharacterManager
{
    constructor()
    {
        this.currentCharacterType = 'default'
        this.modelLoader = new ModelLoader()
        this.characters = this.initializeCharacters()
    }

    initializeCharacters()
    {
        return {
            default: {
                name: 'Nhân Vật Mặc Định',
                geometry: () => {
                    const geometry = new THREE.CapsuleGeometry(0.5, 0.8, 3, 16)
                    geometry.translate(0, 0.9, 0)
                    return geometry
                },
                color: '#fff8d6',
                scale: { x: 1, y: 1, z: 1 }
            },

            jaekelopterus: {
                name: 'Jaekelopterus',
                isLocalModel: true,
                modelPath: '/models/Jaekelopterus.glb',
                color: '#2d3748',
                scale: { x: 1.2, y: 1.2, z: 1.2 },
                preserveOriginalColor: true,
                rotationOffset: Math.PI,
                fallbackGeometry: () => {
                    const geometry = new THREE.CapsuleGeometry(0.6, 1.0, 4, 16)
                    geometry.translate(0, 1.0, 0)
                    return geometry
                }
            },

            retro_ufo: {
                name: 'UFO Retro',
                isLocalModel: true,
                modelPath: '/models/Retro UFO.glb',
                color: '#00bcd4',
                scale: { x: 0.8, y: 0.8, z: 0.8 },
                preserveOriginalColor: true,
                rotationOffset: 0,
                fallbackGeometry: () => {
                    const geometry = new THREE.CylinderGeometry(0.8, 0.5, 0.3, 16)
                    geometry.translate(0, 0.6, 0)
                    return geometry
                }
            },

            wacky_ufo: {
                name: 'UFO Kỳ Lạ',
                isLocalModel: true,
                modelPath: '/models/Wacky UFO.glb',
                color: '#9c27b0',
                scale: { x: 1.0, y: 1.0, z: 1.0 },
                preserveOriginalColor: true,
                rotationOffset: 0,
                fallbackGeometry: () => {
                    const geometry = new THREE.SphereGeometry(0.6, 12, 8)
                    geometry.translate(0, 0.8, 0)
                    return geometry
                }
            },

            birdy: {
                name: 'Hình Nhân',
                isLocalModel: true,
                modelPath: '/models/Birdy.glb',
                color: '#ff9800',
                scale: { x: 1.5, y: 1.5, z: 1.5 },
                preserveOriginalColor: true,
                rotationOffset: Math.PI,
                fallbackGeometry: () => {
                    const geometry = new THREE.SphereGeometry(0.4, 12, 8)
                    geometry.translate(0, 0.5, 0)
                    return geometry
                }
            },

            sitting_alien: {
                name: 'Người Ngoài Hành Tinh',
                isLocalModel: true,
                modelPath: '/models/Sitting Alien.glb',
                color: '#4caf50',
                scale: { x: 1.2, y: 1.2, z: 1.2 },
                preserveOriginalColor: true,
                rotationOffset: Math.PI,
                fallbackGeometry: () => {
                    const geometry = new THREE.CapsuleGeometry(0.5, 0.8, 4, 16)
                    geometry.translate(0, 0.9, 0)
                    return geometry
                }
            },

            reaper: {
                name: 'Thần Chết',
                isLocalModel: true,
                modelPath: '/models/Reaper.glb',
                color: '#424242',
                scale: { x: 1.0, y: 1.0, z: 1.0 },
                preserveOriginalColor: true,
                rotationOffset: Math.PI,
                fallbackGeometry: () => {
                    const geometry = new THREE.ConeGeometry(0.6, 1.8, 8)
                    geometry.translate(0, 1.0, 0)
                    return geometry
                }
            },

            // Models online từ Three.js examples
            robot_expressive: {
                name: 'Robot',
                isOnlineModel: true,
                modelKey: 'robot_simple',
                color: '#fff8d6',
                scale: { x: 0.8, y: 0.8, z: 0.8 },
                preserveOriginalColor: true,
                rotationOffset: 0
            },

        }
    }

    getCharacterData(type = this.currentCharacterType)
    {
        return this.characters[type] || this.characters.default
    }

    getAvailableCharacters()
    {
        return Object.keys(this.characters).map(key => ({
            id: key,
            name: this.characters[key].name
        }))
    }

    setCharacterType(type)
    {
        if (this.characters[type]) {
            this.currentCharacterType = type
            return true
        }
        return false
    }

    getCurrentCharacterType()
    {
        return this.currentCharacterType
    }
} 