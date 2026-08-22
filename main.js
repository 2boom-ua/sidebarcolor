// CSS Color Converter
// Copyright 2boom, 2026

let currentLocale = 'en';
let translations = {};

function getLocale() {
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const lang = browserLang.split('-')[0];
    const available = ['en', 'uk'];
    return available.includes(lang) ? lang : 'en';
}

function t(key) {
    return translations[key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key && typeof val === 'string') {
            if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                el.textContent = val;
            } else {
                let hasText = false;
                el.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        node.textContent = val;
                        hasText = true;
                    }
                });
                if (!hasText && !el.querySelector('img, input')) {
                    el.prepend(document.createTextNode(val));
                }
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val && val !== key && typeof val === 'string') el.placeholder = val;
    });
}

function loadMessages(locale) {
    return fetch(`_locales/${locale}/messages.json`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => {
            translations = {};
            for (let key in data) {
                if (data[key] && data[key].message) {
                    translations[key] = data[key].message;
                }
            }
            currentLocale = locale;
            applyTranslations();
            return data;
        })
        .catch(() => {
            return fetch('_locales/en/messages.json')
                .then(res => res.json())
                .then(data => {
                    translations = {};
                    for (let key in data) {
                        if (data[key] && data[key].message) {
                            translations[key] = data[key].message;
                        }
                    }
                    currentLocale = 'en';
                    applyTranslations();
                    return data;
                })
                .catch(() => {
                    translations = {
                        appTitle: 'Color Converter',
                        hexLabel: 'HEX',
                        rgbLabel: 'RGB',
                        hslLabel: 'HSL',
                        rgbaLabel: 'RGBA',
                        filterLabel: 'FILTER',
                        alphaLabel: 'Alpha',
                        hexPlaceholder: '#RRGGBB',
                        copyTitle: 'Copy to clipboard',
                        pasteTitle: 'Paste from clipboard',
                        clearTitle: 'Clear',
                        colorPickerTitle: 'Pickup color',
                        copiedText: 'Copied!'
                    };
                    applyTranslations();
                });
        });
}

// ================================================================
// MAIN APPLICATION
// ================================================================
(function() {
    'use strict';

    // ===== DOM refs =====
    const hexInput = document.getElementById('hexInput');
    const colorPicker = document.getElementById('colorPicker');
    const colorSwatch = document.getElementById('colorSwatch');
    const hexValue = document.getElementById('hexValue');
    const oklchValue = document.getElementById('oklchValue');
    const cmykValue = document.getElementById('cmykValue');
    const rgbValue = document.getElementById('rgbValue');
    const hslValue = document.getElementById('hslValue');
    const rgbaValue = document.getElementById('rgbaValue');
    const filterBrightness = document.getElementById('filterBrightness');
    const filterContrast = document.getElementById('filterContrast');
    const filterHueRotate = document.getElementById('filterHueRotate');
    const filterSaturate = document.getElementById('filterSaturate');
    const filterSepia = document.getElementById('filterSepia');
    const alphaSlider = document.getElementById('alphaSlider');
    const alphaValueEl = document.getElementById('alphaValue');
    const pasteBtn = document.getElementById('pasteBtn');
    const copyInputBtn = document.getElementById('copyInputBtn');
    const toast = document.getElementById('toast');

    // ===== NEW DOM refs =====
    const baseCircles = document.getElementById('baseCircles');
    const shadeStrip = document.getElementById('shadeStrip');

    // ===== State =====
    let currentR = 255,
        currentG = 255,
        currentB = 255;
    let currentAlpha = 1;
    let toastTimeout = null;

    // ===== Toast =====
    function showToast() {
        const text = t('copiedText');
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 1500);
    }

    // ===== Helpers =====
    function hexToRgb(hex) {
        let clean = hex.replace('#', '');
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        if (clean.length !== 6) return null;
        const int = parseInt(clean, 16);
        if (isNaN(int)) return null;
        return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
    }

function rgbToOklch(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    
    l = Math.cbrt(l);
    m = Math.cbrt(m);
    s = Math.cbrt(s);
    
    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    
    const C = Math.sqrt(a * a + b_ * b_);
    let h = Math.atan2(b_, a) * (180 / Math.PI);
    if (h < 0) h += 360;
    
    return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

function rgbToHex(r, g, b) {
    const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function rgbToCmyk(r, g, b) {
        let c = 1 - (r / 255);
        let m = 1 - (g / 255);
        let y = 1 - (b / 255);
        let k = Math.min(c, m, y);
        if (k === 1) return `cmyk(0%, 0%, 0%, 100%)`;
        c = ((c - k) / (1 - k)) * 100;
        m = ((m - k) / (1 - k)) * 100;
        y = ((y - k) / (1 - k)) * 100;
        k = k * 100;
        return `cmyk(${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%)`;
    }

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    // ===== Generate filter =====
function generateFilter(r, g, b) {
    const tr = r / 255,
        tg = g / 255,
        tb = b / 255;
    const ref = 0.502;

    const lum = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;
    let brightness = lum / ref;
    brightness = clamp(brightness, 0, 3);

    const maxC = Math.max(tr, tg, tb);
    const minC = Math.min(tr, tg, tb);
    const range = maxC - minC;
    let contrast = 1 + range * 0.8;
    contrast = clamp(contrast, 0.5, 2.5);

    const hsl = rgbToHsl(r, g, b);
    let hueAngle = hsl.h;
    if (hueAngle > 180) {
        hueAngle -= 360;
    }
    hueAngle = clamp(hueAngle, -180, 180);

    const gray = (tr + tg + tb) / 3;
    const diff = Math.abs(tr - gray) + Math.abs(tg - gray) + Math.abs(tb - gray);
    let saturate = 1 + diff * 1.8;
    saturate = clamp(saturate, 0.2, 3);

    let sepia = 0;
    if (tr > 0.5 && tg > 0.3 && tb < 0.4) {
        sepia = 0.6 + (tr - 0.5) * 0.6;
    } else if (tr > tg && tr > tb && tg > 0.3) {
        sepia = 0.3 + (tr - 0.5) * 0.5;
    }
    sepia = clamp(sepia, 0, 1);

    return { brightness, contrast, hueRotate: hueAngle, saturate, sepia };
}
    // ===== Update UI =====
function updateUI() {
    const hex = rgbToHex(currentR, currentG, currentB);
    const rgb = `rgb(${currentR}, ${currentG}, ${currentB})`;
    const rgba = `rgba(${currentR}, ${currentG}, ${currentB}, ${currentAlpha.toFixed(2)})`;
    const hsl = rgbToHsl(currentR, currentG, currentB);
    const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    const oklch = rgbToOklch(currentR, currentG, currentB);
    const cmyk = rgbToCmyk(currentR, currentG, currentB);

    const color = `rgba(${currentR}, ${currentG}, ${currentB}, ${currentAlpha})`;
    colorSwatch.style.setProperty('--swatch-color', color);
    colorSwatch.style.background = color;

    if (hexValue) hexValue.textContent = hex;
    if (oklchValue) oklchValue.textContent = oklch;
    if (cmykValue) cmykValue.textContent = cmyk;
    if (rgbValue) rgbValue.textContent = rgb;
    if (hslValue) hslValue.textContent = hslStr;
    if (rgbaValue) rgbaValue.textContent = rgba;

    const f = generateFilter(currentR, currentG, currentB);
    if (filterBrightness) filterBrightness.textContent = `brightness(${f.brightness.toFixed(2)})`;
    if (filterContrast) filterContrast.textContent = `contrast(${f.contrast.toFixed(2)})`;
    if (filterHueRotate) filterHueRotate.textContent = `hue-rotate(${f.hueRotate.toFixed(1)}deg)`;
    if (filterSaturate) filterSaturate.textContent = `saturate(${f.saturate.toFixed(2)})`;
    if (filterSepia) filterSepia.textContent = `sepia(${f.sepia.toFixed(2)})`;

    if (hexInput) hexInput.value = hex.toUpperCase();
    if (colorPicker) colorPicker.value = hex;
    if (hexInput) hexInput.classList.remove('error');
}

    // ===== Set color from hex =====
    function setColorFromHex(hex) {
        let cleaned = hex.trim().toUpperCase();
        if (!cleaned.startsWith('#')) cleaned = '#' + cleaned;
        const rgb = hexToRgb(cleaned);
        if (!rgb) {
            hexInput.classList.add('error');
            return false;
        }
        hexInput.classList.remove('error');
        currentR = rgb.r;
        currentG = rgb.g;
        currentB = rgb.b;
        currentAlpha = parseFloat(alphaSlider.value) || 1;
        alphaValueEl.textContent = currentAlpha.toFixed(2);
        updateUI();
        
        // Save the last selected color to localStorage
        try {
            localStorage.setItem('savedColor', cleaned);
            // Also save the current base hex (only if this color is a base color)
            if (baseColors.includes(cleaned)) {
                localStorage.setItem('savedBase', cleaned);
            }
        } catch (e) {
            // localStorage not available or full
        }
        
        return true;
    }

    // ===== Update alpha =====
    function updateAlpha() {
        currentAlpha = parseFloat(alphaSlider.value);
        alphaValueEl.textContent = currentAlpha.toFixed(2);
        updateUI();
    }

    // ===== Clear =====
    function clearColor() {
        hexInput.value = '#FFFFFF';
        setColorFromHex('#FFFFFF');
        alphaSlider.value = '1';
        currentAlpha = 1;
        alphaValueEl.textContent = '1.00';
        updateUI();
        hexInput.focus();
        hexInput.select();
    }

    // ===== Copy =====
    function copyValue(format) {
        let text = '';
        switch (format) {
            case 'hex':
                text = hexValue.textContent;
                break;
            case 'oklch':
                text = oklchValue.textContent;
                break;
            case 'cmyk':
                text = cmykValue.textContent;
                break;
            case 'rgb':
                text = rgbValue.textContent;
                break;
            case 'hsl':
                text = hslValue.textContent;
                break;
            case 'rgba':
                text = rgbaValue.textContent;
                break;
            case 'filter':
                text = `${filterBrightness.textContent} ${filterContrast.textContent} ${filterHueRotate.textContent} ${filterSaturate.textContent} ${filterSepia.textContent}`;
                break;
            default:
                return;
        }
        if (!text) return;

        const btn = document.querySelector(`[data-copy="${format}"]`);
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) { /* ignore */ }
            document.body.removeChild(ta);
            showCopied(btn);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => showCopied(btn)).catch(() => fallback());
        } else {
            fallback();
        }
    }

    let copyTimeouts = {};

    function showCopied(btn) {
        if (!btn) return;
        btn.classList.add('copied');
        const img = btn.querySelector('img');
        if (img) {
            img.src = 'icons/check.svg';
            img.alt = 'Copied';
        }
        showToast();
        clearTimeout(copyTimeouts[btn.dataset.copy]);
        copyTimeouts[btn.dataset.copy] = setTimeout(() => {
            btn.classList.remove('copied');
            const img2 = btn.querySelector('img');
            if (img2) {
                img2.src = 'icons/copy.svg';
                img2.alt = 'Copy';
            }
        }, 1500);
    }

    // ============================================================
    // ===== NEW: SHADE STRIP & BASE COLORS LOGIC =====
    // ============================================================

    // Predefined base colors (fixed duplicates)
    const baseColors = [
        '#000000', // Black
        '#2196F3', // Blue
        '#4CAF50', // Green
        '#FFC107', // Yellow
        '#F44336', // Red
        '#FF9800', // Orange (replaced duplicate light-blue)
        '#9C27B0', // Purple
        '#E91E63', // Pink
    ];

    // Default base (Black) unless saved in localStorage
    let currentBaseHex = '#000000';
    const savedBase = localStorage.getItem('savedBase');
    if (savedBase && baseColors.includes(savedBase)) {
        currentBaseHex = savedBase;
    }

    // Generate 10 shades from a base color (fixed for black & better gradient)
    function generateShades(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return [];
        
        const shades = [];
        const isBlack = (rgb.r === 0 && rgb.g === 0 && rgb.b === 0);
        
        for (let i = 0; i < 10; i++) {
            // factor від 0.1 до 1.0 (для чорного це буде яскравість сірого)
            const factor = (i + 1) / 10; 
            
            let r, g, b;
            
            if (isBlack) {
                // Якщо колір чорний, робимо градації сірого (від темно-сірого до білого)
                const gray = Math.round(255 * factor);
                r = gray;
                g = gray;
                b = gray;
            } else {
                // Для кольорових: плавно змішуємо з білим (світлішаємо)
                // factor 0.1 = майже білий, factor 1.0 = чистий колір
                r = Math.round(rgb.r + (255 - rgb.r) * (1 - factor));
                g = Math.round(rgb.g + (255 - rgb.g) * (1 - factor));
                b = Math.round(rgb.b + (255 - rgb.b) * (1 - factor));
            }
            
            shades.push(rgbToHex(r, g, b));
        }
        return shades;
    }

    // Render base color circles
    function renderBaseCircles() {
        baseCircles.innerHTML = '';
        baseColors.forEach(hex => {
            const circle = document.createElement('div');
            circle.className = 'base-circle';
            circle.style.backgroundColor = hex;
            circle.dataset.hex = hex;
            if (hex === currentBaseHex) {
                circle.classList.add('active');
            }
            circle.addEventListener('click', function() {
                // Remove active state from all base circles
                document.querySelectorAll('.base-circle').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                // Update current base hex
                currentBaseHex = this.dataset.hex;
                
                // 1. Pass the base color directly to the input and update all conversions
                setColorFromHex(currentBaseHex);
                
                // 2. Regenerate the shade strip based on the new base color
                renderShadeStrip();
            });
            baseCircles.appendChild(circle);
        });
    }

    // Render the 1x10 shade strip
    function renderShadeStrip() {
        shadeStrip.innerHTML = '';
        const shades = generateShades(currentBaseHex);
        
        shades.forEach((hex, index) => {
            const cell = document.createElement('div');
            cell.className = 'shade-cell';
            cell.style.backgroundColor = hex;
            cell.dataset.hex = hex;
            
            // Check if this shade matches the currently selected color
            const currentHex = rgbToHex(currentR, currentG, currentB);
            if (hex === currentHex) {
                cell.classList.add('active');
            }

            cell.addEventListener('click', function() {
                // Remove active from all cells
                document.querySelectorAll('.shade-cell').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                // Update the main app with this color
                setColorFromHex(this.dataset.hex);
            });

            shadeStrip.appendChild(cell);
        });
    }

    // ============================================================

// ===== Init =====
function init() {
    const locale = getLocale();
    loadMessages(locale).then(() => {
        // 1. Set default color (white) or restore from localStorage
        const savedColor = localStorage.getItem('savedColor');
        if (savedColor && savedColor !== '') {
            setColorFromHex(savedColor);
        } else {
            setColorFromHex('#FFFFFF');
        }
        alphaSlider.value = '1';
        currentAlpha = 1;
        alphaValueEl.textContent = '1.00';
        updateUI();

        // 2. Render base circles and shade strip
        renderBaseCircles();
        renderShadeStrip();

        // 3. Event listeners
        hexInput.addEventListener('input', function() {
            const val = this.value.toUpperCase();
            this.value = val;
            if (val.length >= 3) {
                setColorFromHex(val);
                // Update active state in strip
                document.querySelectorAll('.shade-cell').forEach(c => {
                    c.classList.remove('active');
                    if (c.dataset.hex === val) {
                        c.classList.add('active');
                    }
                });
            }
        });

        hexInput.addEventListener('blur', function() {
            let val = this.value.trim();
            if (val && !val.startsWith('#')) {
                val = '#' + val;
                setColorFromHex(val);
            }
        });

        colorPicker.addEventListener('input', function() {
            const val = this.value.toUpperCase();
            setColorFromHex(val);
            // Update active state in strip
            document.querySelectorAll('.shade-cell').forEach(c => {
                c.classList.remove('active');
                if (c.dataset.hex === val) {
                    c.classList.add('active');
                }
            });
        });

        alphaSlider.addEventListener('input', updateAlpha);

        document.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                copyValue(this.dataset.copy);
            });
        });

        pasteBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    hexInput.value = text;
                    setColorFromHex(text);
                }
            } catch (err) {
                try {
                    const ta = document.createElement('textarea');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    ta.style.top = '0';
                    document.body.appendChild(ta);
                    ta.focus();
                    document.execCommand('paste');
                    const val = ta.value;
                    document.body.removeChild(ta);
                    if (val) {
                        hexInput.value = val;
                        setColorFromHex(val);
                    }
                } catch (e2) { /* ignore */ }
            }
        });
        
        copyInputBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = hexInput.value;
            if (!text) return;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => showCopied(this)).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    ta.style.top = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showCopied(this);
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showCopied(this);
            }
        });

    });
}

document.addEventListener('DOMContentLoaded', init);

})();