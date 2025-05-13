import { vec3 } from 'gl-matrix'

import Game from '@/Game.js'
import State from '@/State/State.js'
import Camera from './Camera.js'
import SoundManager from '@/View/SoundManager.js'

export default class Player
{
    constructor()
    {
        this.game = Game.getInstance()
        this.state = State.getInstance()
        this.time = this.state.time
        this.controls = this.state.controls

        this.rotation = 0
        this.inputSpeed = 10
        this.inputBoostSpeed = 30
        this.speed = 0

        // Thêm các tham số cho chức năng nhảy
        this.jumpHeight = 5
        this.jumpDuration = 0.6
        this.isJumping = false
        this.jumpTime = 0
        this.startJumpHeight = 0
        this.wasJumping = false

        this.position = {}
        this.position.current = vec3.fromValues(10, 0, 1)
        this.position.previous = vec3.clone(this.position.current)
        this.position.delta = vec3.create()

        this.camera = new Camera(this)
        
        // Lắng nghe sự kiện phím nhảy
        this.controls.events.on('jumpDown', () => {
            this.jump()
        })
    }

    jump()
    {
        // Chỉ nhảy khi người chơi đang đứng trên mặt đất
        if(!this.isJumping)
        {
            this.isJumping = true
            this.jumpTime = 0
            this.startJumpHeight = this.position.current[1]
        }
    }

    update()
    {
        if(this.camera.mode !== Camera.MODE_FLY && (this.controls.keys.down.forward || this.controls.keys.down.backward || this.controls.keys.down.strafeLeft || this.controls.keys.down.strafeRight))
        {
            this.rotation = this.camera.thirdPerson.theta

            if(this.controls.keys.down.forward)
            {
                if(this.controls.keys.down.strafeLeft)
                    this.rotation += Math.PI * 0.25
                else if(this.controls.keys.down.strafeRight)
                    this.rotation -= Math.PI * 0.25
            }
            else if(this.controls.keys.down.backward)
            {
                if(this.controls.keys.down.strafeLeft)
                    this.rotation += Math.PI * 0.75
                else if(this.controls.keys.down.strafeRight)
                    this.rotation -= Math.PI * 0.75
                else
                    this.rotation -= Math.PI
            }
            else if(this.controls.keys.down.strafeLeft)
            {
                this.rotation += Math.PI * 0.5
            }
            else if(this.controls.keys.down.strafeRight)
            {
                this.rotation -= Math.PI * 0.5
            }

            const speed = this.controls.keys.down.boost ? this.inputBoostSpeed : this.inputSpeed

            const x = Math.sin(this.rotation) * this.time.delta * speed
            const z = Math.cos(this.rotation) * this.time.delta * speed

            this.position.current[0] -= x
            this.position.current[2] -= z
        }

        vec3.sub(this.position.delta, this.position.current, this.position.previous)
        vec3.copy(this.position.previous, this.position.current)

        this.speed = vec3.len(this.position.delta)
        
        // Update view
        this.camera.update()

        // Cập nhật logic nhảy
        if(this.isJumping)
        {
            this.wasJumping = true
            this.jumpTime += this.time.delta
            
            if(this.jumpTime < this.jumpDuration)
            {
                // Sử dụng hàm sin để tạo hiệu ứng nhảy mượt mà
                const jumpProgress = this.jumpTime / this.jumpDuration
                const jumpHeightOffset = Math.sin(jumpProgress * Math.PI) * this.jumpHeight
                
                // Update elevation cho phần nhảy
                const chunks = this.state.chunks
                const groundElevation = chunks.getElevationForPosition(this.position.current[0], this.position.current[2])
                
                if(groundElevation)
                    this.position.current[1] = groundElevation + jumpHeightOffset
                else
                    this.position.current[1] = jumpHeightOffset
            }
            else
            {
                this.isJumping = false
                
                // Phát âm thanh hạ cánh
                const soundManager = SoundManager.getInstance()
                if(soundManager) {
                    soundManager.playSound('land')
                }
            }
        }
        else
        {
            // Kiểm tra để phát âm thanh hạ cánh
            if(this.wasJumping)
            {
                this.wasJumping = false
            }
            
            // Update elevation khi không nhảy
            const chunks = this.state.chunks
            const elevation = chunks.getElevationForPosition(this.position.current[0], this.position.current[2])

            if(elevation)
                this.position.current[1] = elevation
            else
                this.position.current[1] = 0
        }
    }
}