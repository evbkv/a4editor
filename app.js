if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => {
                console.log('ServiceWorker registration successful:', registration.scope);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New app version is available. It will activate on next page load.');
                        }
                    });
                });
                
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const textarea = document.getElementById('main-textarea');
    const marker = document.getElementById('marker');
    const menu = document.getElementById('menu');
    const menuSelect = document.querySelectorAll('.menu-select');

    let currentTheme = 'light';
    let hasUnsavedChanges = false;
    let autoSaveInterval = null;
    let lastSavedContent = '';
    let isAppActive = true;
    let saveTimeout = null;

    const THEMES = {
        white: {
            bg: '#FFFFFF',
            text: '#1A1A1A'
        },
        light: {
            bg: '#F0F0F0',
            text: '#333333'
        },
        sepia: {
            bg: '#F8F4E6',
            text: '#2A2A2A'
        },
        dark: {
            bg: '#1E1E1E',
            text: '#B3B3B3'
        },
        black: {
            bg: '#000000',
            text: '#E0E0E0'
        }
    };
    const THEME_ORDER = ['white', 'light', 'sepia', 'dark', 'black'];

    const FONTS = [
        "'IBM Plex Mono', monospace",
        "'IBM Plex Sans', sans-serif",
        "'IBM Plex Serif', serif",
        "'Courier Prime', monospace",
        "'Caveat', cursive"
    ];
    const FONT_NAMES = [
        "IBM Plex Mono",
        "IBM Plex Sans",
        "IBM Plex Serif",
        "Courier Prime",
        "Caveat"
    ];
    const FONT_SIZES = [
        ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
        ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
        ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
        ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
        ['max(16px, 1.38vw)', 'max(20px, 1.79vw)', 'max(26px, 2.33vw)']
    ];
    const FONT_SIZE_NAMES = ['Small', 'Medium', 'Large'];
    let currentFontSizeIndex = 1;
    let currentFontIndex = 0;

    const applyFontSize = () => {
        const fontSize = FONT_SIZES[currentFontIndex][currentFontSizeIndex];
        textarea.style.fontSize = fontSize;
        localStorage.setItem('editorFontSize', currentFontSizeIndex);
        updateFontSizeButton();
    };

    const updateFontSizeButton = () => {
        const fontSizeBtn = document.getElementById('font-size-btn');
        if (!fontSizeBtn) return;
        fontSizeBtn.textContent = FONT_SIZE_NAMES[currentFontSizeIndex];
    };

    const toggleFontSize = () => {
        currentFontSizeIndex = (currentFontSizeIndex + 1) % FONT_SIZE_NAMES.length;
        applyFontSize();
    };

    const initFontSize = () => {
        const savedSize = localStorage.getItem('editorFontSize');
        if (savedSize !== null) {
            const sizeIndex = parseInt(savedSize, 10);
            if (sizeIndex >= 0 && sizeIndex < FONT_SIZE_NAMES.length) {
                currentFontSizeIndex = sizeIndex;
            }
        }
        applyFontSize();
    };

    const initFont = () => {
        const savedFont = localStorage.getItem('editorFont');
        if (savedFont && FONTS.includes(savedFont)) {
            currentFontIndex = FONTS.indexOf(savedFont);
        } else {
            currentFontIndex = 0;
        }
        applyFont(FONTS[currentFontIndex]);
        updateFontButton();
        applyFontSize();
    };

    const applyFont = (font) => {
        textarea.style.fontFamily = font;
        localStorage.setItem('editorFont', font);
        updateFontButton();
    };

    const toggleFont = () => {
        currentFontIndex = (currentFontIndex + 1) % FONTS.length;
        applyFont(FONTS[currentFontIndex]);
        updateFontButton();
        applyFontSize();
    };

    const updateFontButton = () => {
        const fontNameElement = faceBtn.querySelector('.menu-select');
        if (fontNameElement) {
            fontNameElement.textContent = FONT_NAMES[currentFontIndex];
            fontNameElement.style.fontFamily = FONTS[currentFontIndex];
        }
    };

    const loadSavedText = () => {
        const savedText = localStorage.getItem('editorContent');
        if (savedText) {
            textarea.value = savedText;
            lastSavedContent = savedText;
            updateSaveStatus(false);
            textarea.setSelectionRange(0, 0);
        }
    };

    const saveText = () => {
        const content = textarea.value;
        localStorage.setItem('editorContent', content);
        lastSavedContent = content;
        updateSaveStatus(false);
        console.log('Text saved');
    };

    const updateSaveStatus = (unsaved = true) => {
        hasUnsavedChanges = unsaved;
        marker.style.backgroundColor = unsaved ? '#E74C3C' : '#808080';
    };

    const startAutoSave = () => {
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        
        autoSaveInterval = setInterval(() => {
            if (hasUnsavedChanges && isAppActive) {
                saveText();
            }
        }, 60 * 1000);
    };

    const stopAutoSave = () => {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
    };

    const exportText = () => {
        const content = textarea.value;
        
        const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const textEncoder = new TextEncoder();
        const encodedContent = textEncoder.encode(content);
        const fullContent = new Uint8Array(BOM.length + encodedContent.length);
        fullContent.set(BOM);
        fullContent.set(encodedContent, BOM.length);
        
        const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
        
        const date = new Date();
        const fileName = `Note_${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}.txt`;
        
        if ('showSaveFilePicker' in window) {
            try {
                window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Text Files',
                        accept: {
                            'text/plain': ['.txt'],
                        },
                    }],
                }).then(async (handle) => {
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                }).catch((error) => {
                    console.log('File System API error:', error);
                    fallbackExport(blob, fileName);
                });
            } catch (error) {
                console.log('File System API error:', error);
                fallbackExport(blob, fileName);
            }
        } else {
            fallbackExport(blob, fileName);
        }
    };

    const fallbackExport = (blob, fileName) => {
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem('editorTheme');
        if (THEME_ORDER.includes(savedTheme)) {
            currentTheme = savedTheme;
        } else {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                currentTheme = 'dark';
            } else {
                currentTheme = 'light';
            }
        }

        applyTheme(currentTheme);

        const themeNameElement = themeBtn.querySelector('.menu-select');
        if (themeNameElement) {
            themeNameElement.textContent = 
                currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
        }
    };

    const applyTheme = (theme) => {
        currentTheme = theme;
        const bgColor = THEMES[theme].bg;
        const textColor = THEMES[theme].text;
        
        body.style.backgroundColor = bgColor;
        textarea.style.backgroundColor = bgColor;
        if (theme === 'dark' || theme === 'black') {
            menu.style.backgroundColor = '#000000';
            menuSelect.forEach((item) => {
                item.style.color = '#FFFFFF';
            });
        } else {
            menu.style.backgroundColor = '#FFFFFF';
            menuSelect.forEach((item) => {
                item.style.color = '#000000';
            });
        }
        textarea.style.color = textColor;
        transparentBg.style.backgroundColor = hexToRgba(THEMES[currentTheme].bg, 0.5);
        localStorage.setItem('editorTheme', theme);
        
        updateThemeColor(bgColor);
    };

    const updateThemeColor = (color) => {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', color);
        } else {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            themeColorMeta.content = color;
            document.head.appendChild(themeColorMeta);
        }
    };

    const toggleTheme = () => {
        const currentIndex = THEME_ORDER.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
        const newTheme = THEME_ORDER[nextIndex];
        
        applyTheme(newTheme);
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS' && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            saveText();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE' && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            exportText();
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 1;
        }
    };

    const handleTextChange = () => {
        if (textarea.value !== lastSavedContent) {
            updateSaveStatus(true);
        }
    };

    function hexToRgba(hex, opacity) {
        hex = hex.replace('#', '');
        
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    const handleVisibilityChange = () => {
        if (document.hidden) {
            isAppActive = false;
            
            saveTimeout = setTimeout(() => {
                if (hasUnsavedChanges) {
                    saveText();
                }
            }, 500);
            
            stopAutoSave();
        } else {
            isAppActive = true;
            
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
            }
            
            startAutoSave();
        }
    };

    const handlePageHide = () => {
        if (hasUnsavedChanges) {
            saveText();
        }
        stopAutoSave();
    };

    const updateNetworkStatus = () => {
        if (!navigator.onLine) {
            marker.style.backgroundColor = '#FFA500';
        } else {
            marker.style.backgroundColor = hasUnsavedChanges ? '#E74C3C' : '#808080';
        }
    };

    const markerButton = document.getElementById('marker-button');
    const transparentBg = document.getElementById('transparent-bg');
    const menuContainer = document.getElementById('menu-container');
    const themeBtn = document.getElementById('theme-btn');
    const faceBtn = document.getElementById('face-btn');
    const sizeBtn = document.getElementById('size-btn');
    const exportBtn = document.getElementById('export-btn');
    
    markerButton.addEventListener('click', function() {
        if (hasUnsavedChanges) {
            saveText();
            marker.style.backgroundColor = '#808080';
        } else {
            transparentBg.style.backgroundColor = hexToRgba(THEMES[currentTheme].bg, 0.5);
            transparentBg.style.visibility = 'visible';
            menuContainer.style.visibility = 'visible';
        }
    });

    menu.addEventListener('click', function() {
            transparentBg.style.visibility = 'hidden';
            menuContainer.style.visibility = 'hidden';
    });

    themeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
        
        const themeNameElement = this.querySelector('.menu-select');
        if (themeNameElement) {
            themeNameElement.textContent = 
                currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
        }
    });

    faceBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFont();
    });

    sizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFontSize();
    });
    
    exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        exportText();        
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('editorTheme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);
        }
    });

    initTheme();
    initFont();
    initFontSize();
    loadSavedText();
    startAutoSave();

    textarea.addEventListener('input', handleTextChange);
    document.addEventListener('keydown', handleKeyDown);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', () => {
        if (hasUnsavedChanges) {
            saveText();
        }
    });

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            saveText();
            e.preventDefault();
            e.returnValue = '';
        }
    });

    const updateMarkerPosition = () => {
        if (!window.visualViewport) return;

        const vv = window.visualViewport;

        marker.style.top = `${vv.offsetTop + 11}px`;
        marker.style.right = `${11}px`;
    };

    if (window.visualViewport) {
        visualViewport.addEventListener('resize', updateMarkerPosition);
        visualViewport.addEventListener('scroll', updateMarkerPosition);
    }

    window.addEventListener('scroll', updateMarkerPosition);

    updateMarkerPosition();

});