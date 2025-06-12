import * as THREE from 'three'

const vertexShader = `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform vec3 uPlayerPosition;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = modelPosition.xyz;
    
    // Wave animation
    float wave1 = sin(modelPosition.x * uWaveFrequency + uTime * uWaveSpeed) * uWaveHeight;
    float wave2 = sin(modelPosition.z * uWaveFrequency * 0.7 + uTime * uWaveSpeed * 1.2) * uWaveHeight * 0.5;
    float wave3 = sin((modelPosition.x + modelPosition.z) * uWaveFrequency * 0.3 + uTime * uWaveSpeed * 0.8) * uWaveHeight * 0.3;
    
    vElevation = wave1 + wave2 + wave3;
    modelPosition.y += vElevation;
    
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uWaterColor;
uniform vec3 uFoamColor;
uniform float uOpacity;
uniform float uFresnelPower;
uniform vec3 uPlayerPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

void main() {
    // Base water color
    vec3 baseColor = uWaterColor;
    
    // Moving water patterns (thay thế normal map)
    vec2 movingUV1 = vUv * 2.0 + vec2(uTime * 0.05, uTime * 0.03);
    vec2 movingUV2 = vUv * 1.5 + vec2(-uTime * 0.03, uTime * 0.07);
    
    // Tạo pattern từ sin/cos thay vì normal map
    float pattern1 = sin(movingUV1.x * 6.28) * sin(movingUV1.y * 6.28);
    float pattern2 = sin(movingUV2.x * 6.28) * sin(movingUV2.y * 6.28);
    float combinedPattern = (pattern1 + pattern2) * 0.1 + 0.9;
    
    // Apply pattern to water color
    vec3 waterColor = baseColor * combinedPattern;
    
    // Lighting calculations
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(-uSunDirection); // Flip direction
    
    // Diffuse lighting (Lambertian)
    float diffuse = max(dot(normal, sunDirection), 0.0);
    vec3 diffuseColor = waterColor * uSunColor * uSunIntensity * diffuse;
    
    // Ambient lighting
    vec3 ambientColor = waterColor * uAmbientColor * uAmbientIntensity;
    
    // Specular reflection (Phong)
    vec3 reflectDirection = reflect(-sunDirection, normal);
    float specular = pow(max(dot(viewDirection, reflectDirection), 0.0), 32.0);
    vec3 specularColor = uSunColor * uSunIntensity * specular * 0.5;
    
    // Combine lighting
    vec3 litColor = ambientColor + diffuseColor + specularColor;
    
    // Fresnel effect
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), uFresnelPower);
    
    // Water color with foam on high waves
    float foamFactor = smoothstep(0.15, 0.35, abs(vElevation));
    vec3 finalColor = mix(litColor, uFoamColor, foamFactor * 0.5);
    
    // Add fresnel reflection
    vec3 skyColor = mix(vec3(0.5, 0.7, 1.0), vec3(0.8, 0.9, 1.0), fresnel);
    finalColor = mix(finalColor, skyColor, fresnel * 0.4);
    
    // Distance fade - render distance 200-300
    float distanceToPlayer = distance(vWorldPosition, uPlayerPosition);
    float fadeAlpha = 1.0 - smoothstep(200.0, 300.0, distanceToPlayer);
    
    gl_FragColor = vec4(finalColor, uOpacity * fadeAlpha);
}
`;

export default function OceanMaterial() {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWaveHeight: { value: 0.5 },
            uWaveFrequency: { value: 0.05 },
            uWaveSpeed: { value: 1.0 },
            uWaterColor: { value: new THREE.Color('#1d3456') },
            uFoamColor: { value: new THREE.Color('#ffffff') },
            uOpacity: { value: 0.8 },
            uFresnelPower: { value: 2.0 },
            uPlayerPosition: { value: new THREE.Vector3() },
            uSunDirection: { value: new THREE.Vector3(0.5, -0.5, 0.5) },
            uSunColor: { value: new THREE.Color('#ffffff') },
            uSunIntensity: { value: 1.0 },
            uAmbientColor: { value: new THREE.Color('#87CEEB') },
            uAmbientIntensity: { value: 0.3 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    return material;
} 