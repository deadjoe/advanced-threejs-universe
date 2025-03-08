/**
 * 太阳材质和着色器
 */
function createSunMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // 简单噪声函数
            float noise(vec3 p) {
                float n = sin(p.x * 10.0) * 0.5 + 0.5;
                n += sin(p.y * 10.0) * 0.5 + 0.5;
                n += sin(p.z * 10.0) * 0.5 + 0.5;
                n += sin((p.x + p.y + p.z) * 10.0) * 0.5 + 0.5;
                return n * 0.25;
            }
            
            void main() {
                // 计算球面坐标
                vec3 pos = normalize(vPosition);
                
                // 在球面上移动的噪声
                float n1 = noise(pos * 2.0 + vec3(0.0, 0.0, time * 0.05));
                float n2 = noise(pos * 4.0 + vec3(0.0, time * 0.1, 0.0));
                float n3 = noise(pos * 8.0 + vec3(time * 0.1, 0.0, 0.0));
                
                // 混合噪声层
                float n = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
                
                // 颜色渐变
                vec3 baseColor = vec3(1.0, 0.3, 0.0); // 橙色
                vec3 brightColor = vec3(1.0, 0.9, 0.5); // 黄色
                vec3 darkColor = vec3(0.8, 0.1, 0.0); // 深红色
                
                // 根据噪声混合颜色
                vec3 color = mix(darkColor, baseColor, n);
                color = mix(color, brightColor, pow(n, 3.0));
                
                // 添加边缘发光效果
                float rim = 1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0)));
                color += brightColor * pow(rim, 2.0);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.FrontSide
    });
}

/**
 * 太阳光晕效果
 */
function createSunGlow(radius) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // 计算视线方向
                vec3 viewDirection = normalize(cameraPosition - vPosition);
                float intensity = pow(0.6 - dot(vNormal, viewDirection), 2.0);
                
                // 脉动效果
                float pulse = 0.5 + 0.5 * sin(time * 0.5);
                intensity *= 1.0 + pulse * 0.2;
                
                // 颜色渐变
                vec3 color = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.9, 0.6), pow(intensity, 2.0));
                
                gl_FragColor = vec4(color, intensity);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    
    const glow = new THREE.Mesh(geometry, material);
    return glow;
}

/**
 * 星云着色器
 */
const nebulaVertexShader = `
    attribute float alpha;
    attribute float size;
    uniform float time;
    
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
        vColor = color;
        
        // 基于时间的脉动效果
        float pulse = sin(time + position.x * 0.01 + position.y * 0.01) * 0.1 + 0.9;
        vAlpha = alpha * pulse;
        
        // 设置点大小
        gl_PointSize = size * (300.0 / length(modelViewMatrix * vec4(position, 1.0)));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const nebulaFragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
        // 创建圆形点
        float r = 0.5;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(gl_PointCoord, center);
        float alpha = smoothstep(r, r - 0.1, dist) * vAlpha;
        
        gl_FragColor = vec4(vColor, alpha);
    }
`;

/**
 * Bloom后期处理着色器
 */
const bloomVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const bloomFragmentShader = `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    
    varying vec2 vUv;
    
    void main() {
        vec4 base = texture2D(baseTexture, vUv);
        vec4 bloom = texture2D(bloomTexture, vUv);
        
        // 添加发光
        gl_FragColor = base + bloom;
    }
`;

/**
 * 黑洞吸积盘着色器
 */
const accretionDiskVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const accretionDiskFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // 简单噪声函数
    float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
        // 径向距离
        float dist = length(vPosition.xy);
        
        // 旋转角
        float angle = atan(vPosition.y, vPosition.x);
        
        // 根据距离和角度创建动态纹理
        float speed = 5.0 / dist; // 内部旋转更快
        float offset = time * speed;
        float turbulence = noise(vec2(angle * 20.0 + offset, dist * 5.0)) * 0.1;
        
        // 构造颜色和透明度
        float intensity = smoothstep(0.0, 1.0, 1.0 - abs(vUv.x - 0.5) * 2.0);
        intensity *= (1.0 - turbulence);
        
        // 径向颜色渐变
        float d = smoothstep(0.0, 1.0, (dist - 12.0) / 38.0);
        vec3 color;
        
        if (d < 0.3) {
            // 内部 - 热白色到蓝色
            color = mix(vec3(1.0, 0.9, 0.7), vec3(0.2, 0.5, 1.0), d / 0.3);
        } else if (d < 0.6) {
            // 中部 - 蓝色到紫色
            color = mix(vec3(0.2, 0.5, 1.0), vec3(0.7, 0.2, 1.0), (d - 0.3) / 0.3);
        } else {
            // 外部 - 紫色到红色
            color = mix(vec3(0.7, 0.2, 1.0), vec3(0.9, 0.1, 0.2), (d - 0.6) / 0.4);
        }
        
        // 增加发光效果
        color *= 1.5;
        
        // 添加脉动
        float pulse = 0.9 + 0.1 * sin(time * 2.0 + dist * 0.5);
        intensity *= pulse;
        
        // 最终颜色
        gl_FragColor = vec4(color, intensity);
    }
`;

/**
 * 黑洞引力透镜效果着色器
 */
const lensVertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const lensFragmentShader = `
    uniform float time;
    uniform vec3 blackholePosition;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
        // 计算视线方向
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnelEffect = pow(1.0 - dot(vNormal, viewDirection), 3.0);
        
        // 扭曲效果
        float distortion = 0.5 + 0.5 * sin(time * 0.5 + vPosition.x * 0.1 + vPosition.y * 0.1 + vPosition.z * 0.1);
        distortion = distortion * 0.3 + 0.7;
        
        // 组合效果
        float alpha = fresnelEffect * distortion * 0.4;
        
        // 颜色渐变
        vec3 color = mix(vec3(0.1, 0.2, 0.5), vec3(0.5, 0.2, 0.7), fresnelEffect);
        
        gl_FragColor = vec4(color, alpha);
    }
`;