/**
 * TWEEN.js 库 - 用于平滑动画过渡
 */
class Tween {
    constructor(object) {
        this.object = object;
        this.valuesStart = {};
        this.valuesEnd = {};
        this.duration = 1000;
        this.delayTime = 0;
        this.startTime = null;
        this.easingFunction = Tween.Easing.Linear.None;
        this.onUpdateCallback = null;
        this.onCompleteCallback = null;
    }

    to(properties, duration) {
        this.valuesEnd = properties;
        if (duration !== undefined) {
            this.duration = duration;
        }
        return this;
    }

    start() {
        Tween.add(this);
        this.startTime = Date.now() + this.delayTime;
        
        for (let property in this.valuesEnd) {
            if (this.object[property] === undefined) {
                continue;
            }
            this.valuesStart[property] = this.object[property];
        }
        
        return this;
    }

    update(time) {
        if (time < this.startTime) {
            return true;
        }
        
        let elapsed = (time - this.startTime) / this.duration;
        elapsed = elapsed > 1 ? 1 : elapsed;
        
        const value = this.easingFunction(elapsed);
        
        for (let property in this.valuesEnd) {
            const start = this.valuesStart[property];
            const end = this.valuesEnd[property];
            this.object[property] = start + (end - start) * value;
        }
        
        if (this.onUpdateCallback) {
            this.onUpdateCallback.call(this.object, value);
        }
        
        if (elapsed === 1) {
            if (this.onCompleteCallback) {
                this.onCompleteCallback.call(this.object);
            }
            return false;
        }
        
        return true;
    }

    onUpdate(callback) {
        this.onUpdateCallback = callback;
        return this;
    }

    onComplete(callback) {
        this.onCompleteCallback = callback;
        return this;
    }

    delay(amount) {
        this.delayTime = amount;
        return this;
    }

    easing(easingFunction) {
        this.easingFunction = easingFunction;
        return this;
    }

    static update() {
        const time = Date.now();
        const tweens = Tween.activeTweens;
        
        let i = tweens.length;
        while (i--) {
            if (!tweens[i].update(time)) {
                tweens.splice(i, 1);
            }
        }

        requestAnimationFrame(Tween.update);
    }

    static add(tween) {
        Tween.activeTweens.push(tween);
        if (Tween.activeTweens.length === 1) {
            Tween.update();
        }
    }
}

// 静态属性
Tween.activeTweens = [];

// 缓动函数
Tween.Easing = {
    Linear: {
        None: function(k) {
            return k;
        }
    },
    Quadratic: {
        In: function(k) {
            return k * k;
        },
        Out: function(k) {
            return k * (2 - k);
        },
        InOut: function(k) {
            k *= 2;
            if (k < 1) return 0.5 * k * k;
            k -= 1;
            return -0.5 * (k * (k - 2) - 1);
        }
    },
    Cubic: {
        In: function(k) {
            return k * k * k;
        },
        Out: function(k) {
            k -= 1;
            return k * k * k + 1;
        },
        InOut: function(k) {
            k *= 2;
            if (k < 1) return 0.5 * k * k * k;
            k -= 2;
            return 0.5 * (k * k * k + 2);
        }
    }
};

// 导出到全局作用域
window.TWEEN = Tween;

/**
 * 柏林噪声 - 用于生成自然的随机形状
 */
const noise = {};

(function() {
    let grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    let p = [];
    for (let i = 0; i < 256; i++) {
        p[i] = Math.floor(Math.random() * 256);
    }

    // 填充排列表
    let perm = new Array(512);
    let gradP = new Array(512);

    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        gradP[i] = grad3[perm[i] % 12];
    }

    // 噪声函数
    noise.simplex3 = function(xin, yin, zin) {
        let n0, n1, n2, n3; // 噪声贡献

        // 骨架坐标
        let s = (xin + yin + zin) * F3;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        let k = Math.floor(zin + s);

        let t = (i + j + k) * G3;
        let x0 = xin - i + t;
        let y0 = yin - j + t;
        let z0 = zin - k + t;

        // 确定哪个点贡献
        let i1, j1, k1;
        let i2, j2, k2;

        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            } else if (x0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
            } else {
                i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
            }
        } else {
            if (y0 < z0) {
                i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
            } else if (x0 < z0) {
                i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
            } else {
                i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            }
        }

        // 相对于四个点的坐标
        let x1 = x0 - i1 + G3;
        let y1 = y0 - j1 + G3;
        let z1 = z0 - k1 + G3;
        let x2 = x0 - i2 + 2 * G3;
        let y2 = y0 - j2 + 2 * G3;
        let z2 = z0 - k2 + 2 * G3;
        let x3 = x0 - 1 + 3 * G3;
        let y3 = y0 - 1 + 3 * G3;
        let z3 = z0 - 1 + 3 * G3;

        // 计算散列值
        i &= 255;
        j &= 255;
        k &= 255;
        let gi0 = gradP[(i + perm[j + perm[k]]) % 512];
        let gi1 = gradP[(i + i1 + perm[j + j1 + perm[k + k1]]) % 512];
        let gi2 = gradP[(i + i2 + perm[j + j2 + perm[k + k2]]) % 512];
        let gi3 = gradP[(i + 1 + perm[j + 1 + perm[k + 1]]) % 512];

        // 计算噪声贡献
        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * dot(gi0, x0, y0, z0);
        }

        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * dot(gi1, x1, y1, z1);
        }

        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * dot(gi2, x2, y2, z2);
        }

        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) {
            n3 = 0;
        } else {
            t3 *= t3;
            n3 = t3 * t3 * dot(gi3, x3, y3, z3);
        }

        // 计算32的梯度噪声和返回结果
        return 32 * (n0 + n1 + n2 + n3);
    };

    function dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    const F3 = 1 / 3;
    const G3 = 1 / 6;

})();

// 导出到全局作用域
window.noise = noise;