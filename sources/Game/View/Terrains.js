import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'
import Terrain from './Terrain.js'
import TerrainGradient from './TerrainGradient.js'
import TerrainMaterial from './Materials/TerrainMaterial.js'

export default class Terrains
{
    constructor()
    {
        this.game = Game.getInstance()
        this.state = State.getInstance()
        this.view = View.getInstance()
        this.debug = View.getInstance()

        this.viewport = this.state.viewport
        this.sky =  this.view.sky

        this.setGradient()
        this.setMountainTexture()
        this.setMaterial()
        this.setDebug()

        this.state.terrains.events.on('create', (engineTerrain) =>
        {
            const terrain = new Terrain(this, engineTerrain)

            engineTerrain.events.on('destroy', () =>
            {
                terrain.destroy()
            })
        })
    }

    setGradient()
    {
        this.gradient = new TerrainGradient()
    }

    setMountainTexture()
    {
        const textureLoader = new THREE.TextureLoader()
        this.mountainTexture = textureLoader.load('/models/terrain/mountain/ground_grass_3264_4062_Small.jpg')
        this.mountainTexture.wrapS = THREE.RepeatWrapping
        this.mountainTexture.wrapT = THREE.RepeatWrapping
        this.mountainTexture.repeat.set(50, 50) // Lặp lại texture để tạo chi tiết
        
        console.log('🏔️ Mountain texture loaded')
    }

    setMaterial()
    {
        this.material = new TerrainMaterial()
        this.material.uniforms.uPlayerPosition.value = new THREE.Vector3()
        this.material.uniforms.uGradientTexture.value = this.gradient.texture
        this.material.uniforms.uLightnessSmoothness.value = 0.25
        this.material.uniforms.uFresnelOffset.value = 0
        this.material.uniforms.uFresnelScale.value = 0.5
        this.material.uniforms.uFresnelPower.value = 2
        this.material.uniforms.uSunPosition.value = new THREE.Vector3(- 0.5, - 0.5, - 0.5)
        this.material.uniforms.uFogTexture.value = this.sky.customRender.texture
        this.material.uniforms.uGrassDistance.value = this.state.chunks.minSize
        this.material.uniforms.uMountainTexture.value = this.mountainTexture
        this.material.uniforms.uMountainElevationThreshold.value = 8.0  // Độ cao ngưỡng để chuyển sang texture núi
        this.material.uniforms.uMountainTransitionSmoothness.value = 3.0  // Độ mềm mại của chuyển tiếp

        this.material.onBeforeRender = (renderer, scene, camera, geometry, mesh) =>
        {
            this.material.uniforms.uTexture.value = mesh.userData.texture
            this.material.uniformsNeedUpdate = true
        }

        // this.material.wireframe = true

        // const dummy = new THREE.Mesh(
        //     new THREE.SphereGeometry(30, 64, 32),
        //     this.material
        // )
        // dummy.position.y = 50
        // this.scene.add(dummy)
    }

    setDebug()
    {
        if(!this.debug.active)
            return

        const folder = this.debug.ui.getFolder('rendering/terrain')

        folder
            .add(this.material, 'wireframe')

        folder
            .add(this.material.uniforms.uLightnessSmoothness, 'value')
            .min(0)
            .max(1)
            .step(0.001)
            .name('uLightnessSmoothness')
        
        folder
            .add(this.material.uniforms.uFresnelOffset, 'value')
            .min(- 1)
            .max(1)
            .step(0.001)
            .name('uFresnelOffset')
        
        folder
            .add(this.material.uniforms.uFresnelScale, 'value')
            .min(0)
            .max(2)
            .step(0.001)
            .name('uFresnelScale')
        
        folder
            .add(this.material.uniforms.uFresnelPower, 'value')
            .min(1)
            .max(10)
            .step(1)
            .name('uFresnelPower')

        // Mountain controls
        const mountainFolder = folder.addFolder('mountain')
        
        mountainFolder
            .add(this.material.uniforms.uMountainElevationThreshold, 'value')
            .min(0)
            .max(20)
            .step(0.5)
            .name('elevationThreshold')
        
        mountainFolder
            .add(this.material.uniforms.uMountainTransitionSmoothness, 'value')
            .min(0.1)
            .max(10)
            .step(0.1)
            .name('transitionSmoothness')
    }

    update()
    {
        const playerState = this.state.player
        const playerPosition = playerState.position.current
        const sunState = this.state.sun

        this.material.uniforms.uPlayerPosition.value.set(playerPosition[0], playerPosition[1], playerPosition[2])
        this.material.uniforms.uSunPosition.value.set(sunState.position.x, sunState.position.y, sunState.position.z)
    }

    resize()
    {
    }
}