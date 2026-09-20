window.tailwind = window.tailwind || {};

const conf = {
  "theme": {
    "extend": {
      "colors": {
        "ink": "#17231d",
        "paper": "#f1ead9",
        "paper-deep": "#e5dbc4",
        "paper-soft": "#f7f2e6",
        "paper-light": "#fbf8f0",
        "paper-mid": "#eee5d1",
        "paper-warm": "#e9dfc9",
        "paper-dark": "#d8ccb2",
        "paper-deeper": "#c8baa0",

"field": "#294438",
        "field-soft": "#385448",
        "field-light": "#4a6255",
        "field-muted": "#708379",
        "field-dark": "#21382e",
        "field-deep": "#1b3027",
        "field-black": "#13251e",

"sage": "#607662",
        "sage-light": "#809280",
        "sage-soft": "#99a895",
        "sage-pale": "#b7c0b0",
        "sage-faint": "#d4d9ce",
        "sage-dark": "#4b604f",
        "sage-deep": "#3c5042",

"harvest": "#d4933a",
        "harvest-light": "#e0a95e",
        "harvest-soft": "#e8bb7d",
        "harvest-pale": "#f0d5a9",
        "harvest-dark": "#b87424",
        "harvest-deep": "#915817",
        "harvest-muted": "#b88955",

"berry": "#8e3f45",
        "berry-light": "#a85d63",
        "berry-soft": "#bd7b80",
        "berry-pale": "#d7aaad",
        "berry-dark": "#713238",
        "berry-deep": "#57272c",
        "berry-muted": "#9a666a",

"muted": "#756f61",
        "stone": "#857e70",
        "stone-light": "#a59d8c",
        "stone-soft": "#beb6a5",
        "stone-pale": "#d4cdbd",
        "stone-dark": "#625d51",
        "stone-deep": "#4b473e",

"success": "#53715a",
        "success-light": "#78947e",
        "success-dark": "#38523e",
        "success-pale": "#c8d6ca",

"warning": "#b9782d",
        "warning-light": "#d89b52",
        "warning-dark": "#89551e",
        "warning-pale": "#ecd3ae",

"danger": "#8e3f45",
        "danger-light": "#b5656c",
        "danger-dark": "#682d33",
        "danger-pale": "#dfb9bc",

"info": "#526f72",
        "info-light": "#789294",
        "info-dark": "#3b5558",
        "info-pale": "#c4d3d4"
      },

"fontFamily": {
        "display": [
          "Georgia",
          "Times New Roman",
          "serif"
        ],
        "serif": [
          "Georgia",
          "Times New Roman",
          "serif"
        ],
        "sans": [
          "Trebuchet MS",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        "body": [
          "Trebuchet MS",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        "mono": [
          "SFMono-Regular",
          "Cascadia Code",
          "Cascadia Mono",
          "Consolas",
          "Liberation Mono",
          "monospace"
        ],
        "code": [
          "Cascadia Code",
          "Cascadia Mono",
          "SFMono-Regular",
          "Consolas",
          "monospace"
        ]
      },

"fontSize": {
        "2xs": [
          "0.625rem",
          {
            "lineHeight": "0.875rem",
            "letterSpacing": "0.02em"
          }
        ],
        "xs": [
          "0.75rem",
          {
            "lineHeight": "1rem"
          }
        ],
        "sm": [
          "0.875rem",
          {
            "lineHeight": "1.375rem"
          }
        ],
        "base": [
          "1rem",
          {
            "lineHeight": "1.625rem"
          }
        ],
        "md": [
          "1.0625rem",
          {
            "lineHeight": "1.7rem"
          }
        ],
        "lg": [
          "1.125rem",
          {
            "lineHeight": "1.75rem"
          }
        ],
        "xl": [
          "1.25rem",
          {
            "lineHeight": "1.875rem"
          }
        ],
        "2xl": [
          "1.5rem",
          {
            "lineHeight": "2rem"
          }
        ],
        "3xl": [
          "1.875rem",
          {
            "lineHeight": "2.25rem"
          }
        ],
        "4xl": [
          "2.25rem",
          {
            "lineHeight": "2.5rem"
          }
        ],
        "5xl": [
          "3rem",
          {
            "lineHeight": "1.08",
            "letterSpacing": "-0.02em"
          }
        ],
        "6xl": [
          "3.75rem",
          {
            "lineHeight": "1.02",
            "letterSpacing": "-0.025em"
          }
        ],
        "7xl": [
          "4.5rem",
          {
            "lineHeight": "0.98",
            "letterSpacing": "-0.035em"
          }
        ],
        "8xl": [
          "6rem",
          {
            "lineHeight": "0.95",
            "letterSpacing": "-0.04em"
          }
        ],
        "9xl": [
          "8rem",
          {
            "lineHeight": "0.9",
            "letterSpacing": "-0.05em"
          }
        ]
      },

"letterSpacing": {
        "tighter": "-0.04em",
        "tight": "-0.02em",
        "normal": "0",
        "relaxed": "0.025em",
        "wide": "0.06em",
        "wider": "0.1em",
        "widest": "0.18em"
      },

"lineHeight": {
        "none": "1",
        "tighter": "1.1",
        "tight": "1.2",
        "snug": "1.35",
        "normal": "1.5",
        "relaxed": "1.7",
        "loose": "2"
      },

"spacing": {
        "0.5": "0.125rem",
        "1.5": "0.375rem",
        "2.5": "0.625rem",
        "3.5": "0.875rem",
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "8.5": "2.125rem",
        "9.5": "2.375rem",
        "10.5": "2.625rem",
        "11.5": "2.875rem",
        "12.5": "3.125rem",
        "14.5": "3.625rem",
        "15": "3.75rem",
        "17": "4.25rem",
        "18": "4.5rem",
        "19": "4.75rem",
        "21": "5.25rem",
        "22": "5.5rem",
        "24": "6rem",
        "26": "6.5rem",
        "28": "7rem",
        "30": "7.5rem",
        "32": "8rem",
        "36": "9rem",
        "40": "10rem",
        "44": "11rem",
        "48": "12rem",
        "52": "13rem",
        "56": "14rem",
        "60": "15rem",
        "64": "16rem",
        "72": "18rem",
        "80": "20rem",
        "96": "24rem",
        "128": "32rem",
        "144": "36rem"
      },

"borderRadius": {
        "xs": "0.2rem",
        "sm": "0.35rem",
        "md": "0.65rem",
        "lg": "0.8rem",
        "xl": "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "3rem",
        "7xl": "4rem"
      },

"boxShadow": {
        "xs": "0 1px 2px rgba(23, 35, 29, 0.06)",
        "soft": "0 2px 5px rgba(23, 35, 29, 0.08), 0 1px 2px rgba(23, 35, 29, 0.05)",
        "DEFAULT": "0 4px 12px rgba(23, 35, 29, 0.09), 0 1px 3px rgba(23, 35, 29, 0.05)",
        "md": "0 8px 20px rgba(23, 35, 29, 0.11), 0 2px 5px rgba(23, 35, 29, 0.05)",
        "lg": "0 15px 35px rgba(23, 35, 29, 0.13), 0 4px 10px rgba(23, 35, 29, 0.06)",
        "xl": "0 25px 55px rgba(23, 35, 29, 0.16), 0 8px 18px rgba(23, 35, 29, 0.07)",
        "2xl": "0 35px 80px rgba(23, 35, 29, 0.19), 0 12px 25px rgba(23, 35, 29, 0.08)",
        "inner-deep": "inset 0 3px 8px rgba(23, 35, 29, 0.14)",
        "paper": "0 5px 20px rgba(96, 118, 98, 0.11)",
        "field": "0 8px 25px rgba(19, 37, 30, 0.3)",
        "harvest": "0 8px 25px rgba(212, 147, 58, 0.25)",
        "berry": "0 8px 25px rgba(142, 63, 69, 0.25)",
        "ring-soft": "0 0 0 1px rgba(23, 35, 29, 0.07), 0 4px 20px rgba(23, 35, 29, 0.06)",
        "lifted-paper": "0 2px 0 #d8ccb2, 0 8px 25px rgba(23, 35, 29, 0.10)",
        "field-inset": "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.16)"
      },

"backgroundImage": {
        "paper-noise": "radial-gradient(circle at 20% 20%, rgba(23,35,29,0.035) 0, transparent 30%), radial-gradient(circle at 80% 70%, rgba(212,147,58,0.04) 0, transparent 35%)",
        "paper-grid": "linear-gradient(rgba(23,35,29,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,35,29,0.045) 1px, transparent 1px)",
        "paper-lines": "linear-gradient(to bottom, rgba(23,35,29,0.055) 1px, transparent 1px)",
        "field-glow": "radial-gradient(circle at center, rgba(96,118,98,0.22), transparent 70%)",
        "harvest-glow": "radial-gradient(circle at center, rgba(212,147,58,0.18), transparent 68%)",
        "berry-glow": "radial-gradient(circle at center, rgba(142,63,69,0.18), transparent 68%)",
        "ink-gradient": "linear-gradient(135deg, #17231d 0%, #294438 100%)",
        "field-gradient": "linear-gradient(135deg, #21382e 0%, #294438 50%, #385448 100%)",
        "paper-gradient": "linear-gradient(135deg, #fbf8f0 0%, #f1ead9 50%, #e5dbc4 100%)",
        "harvest-gradient": "linear-gradient(135deg, #b87424 0%, #d4933a 50%, #e0a95e 100%)",
        "berry-gradient": "linear-gradient(135deg, #713238 0%, #8e3f45 50%, #a85d63 100%)"
      },

"animation": {
        "fade-in": "fadeIn 0.45s ease-out forwards",
        "fade-up": "fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-down": "fadeDown 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-left": "fadeLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-right": "fadeRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in": "scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-down": "slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-left": "slideLeft 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-right": "slideRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "float": "float 5s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "wiggle": "wiggle 0.4s ease-in-out",
        "bounce-soft": "bounceSoft 1.5s ease-in-out infinite",
        "spin-slow": "spin 2.5s linear infinite",
        "spin-slower": "spin 5s linear infinite",
        "grow-x": "growX 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "grow-y": "growY 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards"
      },

"keyframes": {
        "fadeIn": {
          "0%": {
            "opacity": "0"
          },
          "100%": {
            "opacity": "1"
          }
        },
        "fadeUp": {
          "0%": {
            "opacity": "0",
            "transform": "translateY(16px)"
          },
          "100%": {
            "opacity": "1",
            "transform": "translateY(0)"
          }
        },
        "fadeDown": {
          "0%": {
            "opacity": "0",
            "transform": "translateY(-16px)"
          },
          "100%": {
            "opacity": "1",
            "transform": "translateY(0)"
          }
        },
        "fadeLeft": {
          "0%": {
            "opacity": "0",
            "transform": "translateX(16px)"
          },
          "100%": {
            "opacity": "1",
            "transform": "translateX(0)"
          }
        },
        "fadeRight": {
          "0%": {
            "opacity": "0",
            "transform": "translateX(-16px)"
          },
          "100%": {
            "opacity": "1",
            "transform": "translateX(0)"
          }
        },
        "scaleIn": {
          "0%": {
            "opacity": "0",
            "transform": "scale(0.96)"
          },
          "100%": {
            "opacity": "1",
            "transform": "scale(1)"
          }
        },
        "slideUp": {
          "0%": {
            "transform": "translateY(100%)"
          },
          "100%": {
            "transform": "translateY(0)"
          }
        },
        "slideDown": {
          "0%": {
            "transform": "translateY(-100%)"
          },
          "100%": {
            "transform": "translateY(0)"
          }
        },
        "slideLeft": {
          "0%": {
            "transform": "translateX(100%)"
          },
          "100%": {
            "transform": "translateX(0)"
          }
        },
        "slideRight": {
          "0%": {
            "transform": "translateX(-100%)"
          },
          "100%": {
            "transform": "translateX(0)"
          }
        },
        "float": {
          "0%, 100%": {
            "transform": "translateY(0)"
          },
          "50%": {
            "transform": "translateY(-8px)"
          }
        },
        "pulseSoft": {
          "0%, 100%": {
            "opacity": "1"
          },
          "50%": {
            "opacity": "0.68"
          }
        },
        "shimmer": {
          "0%": {
            "backgroundPosition": "-200% 0"
          },
          "100%": {
            "backgroundPosition": "200% 0"
          }
        },
        "wiggle": {
          "0%, 100%": {
            "transform": "rotate(0deg)"
          },
          "25%": {
            "transform": "rotate(-2deg)"
          },
          "75%": {
            "transform": "rotate(2deg)"
          }
        },
        "bounceSoft": {
          "0%, 100%": {
            "transform": "translateY(0)"
          },
          "50%": {
            "transform": "translateY(-5px)"
          }
        },
        "growX": {
          "0%": {
            "transform": "scaleX(0)",
            "transformOrigin": "left"
          },
          "100%": {
            "transform": "scaleX(1)",
            "transformOrigin": "left"
          }
        },
        "growY": {
          "0%": {
            "transform": "scaleY(0)",
            "transformOrigin": "top"
          },
          "100%": {
            "transform": "scaleY(1)",
            "transformOrigin": "top"
          }
        }
      },

"maxWidth": {
        "prose": "68ch",
        "reading": "74ch",
        "content-sm": "720px",
        "content-md": "840px",
        "content-lg": "960px",
        "content-xl": "1120px",
        "content-2xl": "1280px",
        "content-wide": "1440px"
      },

"scale": {
        "98": "0.98",
        "99": "0.99",
        "101": "1.01",
        "102": "1.02",
        "103": "1.03",
        "104": "1.04",
        "105": "1.05",
        "110": "1.10"
      },

"rotate": {
        "1": "1deg",
        "2": "2deg",
        "3": "3deg",
        "6": "6deg",
        "8": "8deg",
        "12": "12deg",
        "15": "15deg"
      },

"blur": {
        "4xl": "72px",
        "5xl": "96px"
      },

"backdropBlur": {
        "xs": "2px",
        "4xl": "72px",
        "5xl": "96px"
      }
    }
  }
}

window.tailwind.config = conf;