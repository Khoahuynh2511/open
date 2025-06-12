import * as THREE from 'three'

export default class RainStorm {
    constructor(scene, camera, dayCycle) {
        this.scene = scene
        this.camera = camera
        this.clock = new THREE.Clock()
        this.cloudParticles = []
        this.rainCount = 25000
        this.velocities = new Float32Array(this.rainCount)

        this.dayCycle = dayCycle
        this.originalLightIntensity = 0.5
        this.originalAmbientIntensity = 0.3

        this.init()
    }

    init() {
        // Create rain streaks (lines instead of points)
        const rainVertices = new Float32Array(this.rainCount * 6) // 2 points per line
        for (let i = 0; i < this.rainCount; i++) {
            const x = Math.random() * 1200 - 600
            const y = Math.random() * 500 - 250
            const z = Math.random() * 1200 - 600

            rainVertices[i * 6 + 0] = x
            rainVertices[i * 6 + 1] = y
            rainVertices[i * 6 + 2] = z

            rainVertices[i * 6 + 3] = x
            rainVertices[i * 6 + 4] = y - 2.5 // Line length
            rainVertices[i * 6 + 5] = z

            this.velocities[i] = 0
        }

        this.rainGeo = new THREE.BufferGeometry()
        this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rainVertices, 3))

        const rainMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
        })

        this.rain = new THREE.LineSegments(this.rainGeo, rainMaterial)
        this.scene.add(this.rain)

        // Simplified cloud creation
        const cloudGeometry = new THREE.PlaneBufferGeometry(1000, 1000)
        let cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false
        })

        const loader = new THREE.TextureLoader()
        loader.load(
            './sources/Game/View/Effects/RainStorm/assets/smoke1.jpg',
            (texture) => {
                console.log('Cloud texture loaded successfully')
                cloudMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    color: 0x1a1a2e,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    blending: THREE.NormalBlending
                })
                this.cloudParticles.forEach(cloud => {
                    cloud.material = cloudMaterial
                    cloud.material.needsUpdate = true
                })
            },
            undefined,
            (err) => {
                console.error('Error loading cloud texture:', err)
            }
        )

        const gridSize = 3
        const spacing = 400

        for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
            for (let j = -Math.floor(gridSize / 2); j <= Math.floor(gridSize / 2); j++) {
                const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial)
                cloud.position.set(i * spacing, 100, j * spacing)
                cloud.rotation.x = -Math.PI / 2
                cloud.scale.setScalar(1.5 + Math.random())
                this.cloudParticles.push(cloud)
                this.scene.add(cloud)
            }
        }

        // Initialize lighting with darker, more realistic values for rain
        this.ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.1) // Darker ambient light
        this.scene.add(this.ambientLight)

        this.directionalLight = new THREE.DirectionalLight(0x666688, 0.1) // Reduced directional light
        this.directionalLight.position.set(0, 1, 0)
        this.scene.add(this.directionalLight)

        console.log('Camera position:', this.camera.position)
    }

    update() {
        const time = this.clock.getElapsedTime()

        this.cloudParticles.forEach(p => {
            p.position.x += 0.05 * Math.sin(time * 0.1 + p.position.z)
        })

        const positions = this.rainGeo.attributes.position.array

        for (let i = 0; i < this.rainCount; i++) {
            this.velocities[i] -= Math.random() * 0.02

            // Move both start and end point of line down
            positions[i * 6 + 1] += this.velocities[i]
            positions[i * 6 + 4] += this.velocities[i]

            if (positions[i * 6 + 1] < -200) {
                const x = Math.random() * 1200 - 600
                const y = 200
                const z = Math.random() * 1200 - 600

                positions[i * 6 + 0] = x
                positions[i * 6 + 1] = y
                positions[i * 6 + 2] = z

                positions[i * 6 + 3] = x
                positions[i * 6 + 4] = y - 4
                positions[i * 6 + 5] = z

                this.velocities[i] = 0
            }
        }

        this.rainGeo.attributes.position.needsUpdate = true
        this.rain.rotation.y += 0.001

        // Update lighting based on rain state
        this.updateLighting()
    }

    updateLighting() {
        if (this.dayCycle && this.dayCycle.isRaining) { // Assumes DayCycle has isRaining property
            this.directionalLight.intensity = 0.05 // Dim the sun during rain
            this.ambientLight.intensity = 0.1 // Keep ambient light low for a gloomy effect
            this.cloudParticles.forEach(cloud => {
                cloud.material.opacity = 0.9 // Increase cloud opacity to block more light
            })
        } else {
            this.directionalLight.intensity = this.originalLightIntensity // Restore original light when not raining
            this.ambientLight.intensity = this.originalAmbientIntensity
            this.cloudParticles.forEach(cloud => {
                cloud.material.opacity = 0.8 // Reduce opacity when not raining
            })
        }
    }

    destroy() {
        this.scene.remove(this.rain)
        this.cloudParticles.forEach(c => this.scene.remove(c))
        this.scene.remove(this.ambientLight)
        this.scene.remove(this.directionalLight)
    }
}