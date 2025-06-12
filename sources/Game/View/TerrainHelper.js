import { SimplexNoise } from '../Workers/SimplexNoise.js'

export default class TerrainHelper {
    constructor(params) {
        this.lacunarity = params.lacunarity
        this.persistence = params.persistence
        this.maxIterations = params.maxIterations // Note: The getElevation function in worker uses a passed 'iterations'
        this.baseFrequency = params.baseFrequency
        this.baseAmplitude = params.baseAmplitude
        this.power = params.power
        this.elevationOffset = params.elevationOffset
        this.iterationsOffsets = params.iterationsOffsets
        
        // The getElevation function expects 'iterations' passed to it.
        // State/Terrains.js has a getIterationsForPrecision method.
        // For simplicity here, we might use maxIterations or a fixed reasonable value.
        // Or, the View.js could calculate and pass 'iterations' to getElevation if precision is a factor.
        // For now, let's assume we'll use a fixed number of iterations, e.g., maxIterations for consistency, or a chosen value.
        // This needs to match how the worker determines 'iterations' for getElevation.
        // The worker's getElevation uses an 'iterations' parameter. Let's make our getElevation take it too.

        // Initialize SimplexNoise. The worker uses the main seed.
        this.elevationRandom = new SimplexNoise(params.seed)
    }

    // This function is a direct adaptation from sources/Game/Workers/Terrain.js
    // It now takes 'iterations' as a parameter, which View.js should determine.
    getElevation(x, z, iterations) {
        let elevation = 0
        let frequency = this.baseFrequency
        let amplitude = 1
        let normalisation = 0

        for (let i = 0; i < iterations; i++) {
            // Ensure iterationOffsets has enough entries if iterations can vary
            const offsetIndex = i % this.iterationsOffsets.length
            const noise = this.elevationRandom.noise2D(
                x * frequency + this.iterationsOffsets[offsetIndex][0],
                z * frequency + this.iterationsOffsets[offsetIndex][1]
            )
            elevation += noise * amplitude

            normalisation += amplitude
            amplitude *= this.persistence
            frequency *= this.lacunarity
        }

        if (normalisation === 0) normalisation = 1 // Avoid division by zero if persistence is 0 and iterations is 1
        elevation /= normalisation
        elevation = Math.pow(Math.abs(elevation), this.power) * Math.sign(elevation)
        elevation *= this.baseAmplitude
        elevation += this.elevationOffset

        return elevation
    }
} 