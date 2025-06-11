// Quick Test Script để check model
// Chạy: node test-model.js

const fs = require('fs')
const path = require('path')

const modelPath = './public/models/pikachu.glb'

console.log('🔍 Checking Pikachu model...')

if (fs.existsSync(modelPath)) {
    const stats = fs.statSync(modelPath)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
    
    console.log('✅ Model found!')
    console.log(`📁 Path: ${modelPath}`)
    console.log(`📏 Size: ${sizeInMB} MB`)
    
    if (stats.size > 20 * 1024 * 1024) { // > 20MB
        console.log('⚠️  Warning: Model is quite large, may load slowly')
    } else {
        console.log('✅ Model size looks good!')
    }
    
    console.log('\n🎮 Ready to test in game!')
    console.log('Run: npm run dev')
    
} else {
    console.log('❌ Model not found!')
    console.log(`Expected location: ${path.resolve(modelPath)}`)
    console.log('\n📥 Steps to fix:')
    console.log('1. Download pikachu.glb from Sketchfab')
    console.log('2. Place it in: public/models/pikachu.glb')
    console.log('3. Run this script again')
} 