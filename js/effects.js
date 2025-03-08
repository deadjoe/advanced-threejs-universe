/**
 * 后期处理效果管理
 */
class EffectsManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 初始化合成器
        this.composer = new THREE.EffectComposer(renderer);
        
        // 基础渲染通道
        this.renderPass = new THREE.RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);
        
        // 效果设置
        this.effects = {
            bloom: null,
            bokehBlur: null
        };
        
        // 需要特殊渲染的对象层
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(1); // 位于第1层的物体会发光
    }
    
    // 设置发光效果
    setupBloom(strength = 1.5, radius = 0.4, threshold = 0.85) {
        // 创建UnrealBloom通道
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            strength,
            radius,
            threshold
        );
        
        // 创建最终混合通道
        const finalPass = new THREE.ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: null }
                },
                vertexShader: bloomVertexShader,
                fragmentShader: bloomFragmentShader,
                defines: {}
            }),
            'baseTexture'
        );
        finalPass.needsSwap = true;
        
        // 创建特定的bloom渲染器
        const bloomComposer = new THREE.EffectComposer(this.renderer);
        bloomComposer.renderToScreen = false;
        bloomComposer.addPass(this.renderPass);
        bloomComposer.addPass(bloomPass);
        
        // 设置最终通道的bloom纹理
        finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
        
        // 添加到主合成器
        this.composer.addPass(finalPass);
        
        this.effects.bloom = {
            pass: bloomPass,
            composer: bloomComposer,
            finalPass: finalPass
        };
        
        return this.effects.bloom;
    }
    
    // 使对象发光
    makeObjectGlow(object) {
        object.layers.enable(1); // 添加到发光层
    }
    
    // 更新效果强度
    updateBloomStrength(strength) {
        if (this.effects.bloom && this.effects.bloom.pass) {
            this.effects.bloom.pass.strength = strength;
        }
    }
    
    // 更新效果半径
    updateBloomRadius(radius) {
        if (this.effects.bloom && this.effects.bloom.pass) {
            this.effects.bloom.pass.radius = radius;
        }
    }
    
    // 更新效果阈值
    updateBloomThreshold(threshold) {
        if (this.effects.bloom && this.effects.bloom.pass) {
            this.effects.bloom.pass.threshold = threshold;
        }
    }
    
    // 调整合成器大小
    resize(width, height) {
        this.composer.setSize(width, height);
        
        if (this.effects.bloom && this.effects.bloom.composer) {
            this.effects.bloom.composer.setSize(width, height);
        }
    }
    
    // 渲染场景
    render() {
        // 先渲染发光部分
        if (this.effects.bloom && this.effects.bloom.composer) {
            this.camera.layers.set(1);
            this.effects.bloom.composer.render();
            this.camera.layers.set(0);
        }
        
        // 渲染最终合成
        this.composer.render();
    }
}

/**
 * 粒子系统效果
 */
class ParticleSystemEffect {
    constructor(scene, count = 1000, size = 1.0, color = 0xffffff) {
        this.scene = scene;
        this.count = count;
        this.size = size;
        this.color = color;
        
        this.particles = null;
        this.animationSpeed = 0.001;
    }
    
    // 创建点状粒子系统
    createPointCloud(radius = 100, spread = 100) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);
        
        const color = new THREE.Color(this.color);
        
        for (let i = 0; i < this.count; i++) {
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            const x = Math.cos(angle) * r;
            const y = (Math.random() - 0.5) * spread;
            const z = Math.sin(angle) * r;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // 设置颜色
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // 设置大小
            sizes[i] = this.size * (0.5 + Math.random() * 0.5);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: this.size,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        return this.particles;
    }
    
    // 创建自定义着色器粒子系统
    createShaderParticles(radius = 100, spread = 100) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);
        const alphas = new Float32Array(this.count);
        
        const color = new THREE.Color(this.color);
        
        for (let i = 0; i < this.count; i++) {
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            const x = Math.cos(angle) * r;
            const y = (Math.random() - 0.5) * spread;
            const z = Math.sin(angle) * r;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // 设置颜色
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // 设置大小
            sizes[i] = this.size * (0.5 + Math.random() * 0.5);
            
            // 设置透明度
            alphas[i] = 0.1 + Math.random() * 0.9;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                uniform float time;
                
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vColor = color;
                    
                    // 时间动画效果
                    float pulse = sin(time + position.x * 0.01 + position.y * 0.01) * 0.1 + 0.9;
                    vAlpha = alpha * pulse;
                    
                    // 粒子大小随距离变化
                    gl_PointSize = size * (300.0 / length(modelViewMatrix * vec4(position, 1.0)));
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    // 创建柔和的圆形粒子
                    float r = 0.5;
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(gl_PointCoord, center);
                    float alpha = smoothstep(r, r - 0.1, dist) * vAlpha;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        return this.particles;
    }
    
    // 更新粒子系统
    update(delta) {
        if (!this.particles) return;
        
        if (this.particles.material.uniforms) {
            // 着色器材质
            this.particles.material.uniforms.time.value += delta * this.animationSpeed;
        } else {
            // 标准材质 - 添加简单动画
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < this.count; i++) {
                // 为每个粒子添加小的波动
                positions[i * 3 + 1] += Math.sin(delta * 0.001 + i * 0.01) * 0.01;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // 旋转粒子系统
        this.particles.rotation.y += delta * 0.0001;
    }
    
    // 销毁粒子系统
    destroy() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
    }
}