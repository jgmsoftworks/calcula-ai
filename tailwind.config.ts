import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			sm: '640px',
			md: '768px',
			lg: '1024px',
			xl: '1280px',
			'2xl': '1536px',
			'3xl': '1920px',
			'4xl': '2560px',
		},
		extend: {
			fontFamily: {
				display: ['Plus Jakarta Sans', 'sans-serif'],
				body: ['Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				orange: {
					DEFAULT: 'hsl(var(--orange))',
					light: 'hsl(var(--orange-light))',
					foreground: 'hsl(var(--orange-foreground))'
				},
				red: {
					intense: 'hsl(var(--red-intense))',
					foreground: 'hsl(var(--red-foreground))'
				},
				pink: {
					intense: 'hsl(var(--pink-intense))',
				},
				magenta: {
					DEFAULT: 'hsl(var(--magenta))',
					purple: 'hsl(var(--magenta-purple))'
				},
				purple: {
					dark: 'hsl(var(--purple-dark))',
					foreground: 'hsl(var(--purple-foreground))'
				},
				violet: {
					DEFAULT: 'hsl(var(--violet))',
				},
				blue: {
					royal: 'hsl(var(--blue-royal))',
					vivid: 'hsl(var(--blue-vivid))',
					bright: 'hsl(var(--blue-bright))',
					foreground: 'hsl(var(--blue-foreground))'
				},
				cyan: {
					DEFAULT: 'hsl(var(--cyan))',
					foreground: 'hsl(var(--cyan-foreground))'
				},
				rose: {
					DEFAULT: 'hsl(var(--rose))',
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'calc(var(--radius) + 4px)',
				'2xl': 'calc(var(--radius) + 8px)',
			},
			backgroundImage: {
				'gradient-brand': 'var(--gradient-brand)',
				'gradient-brand-horizontal': 'var(--gradient-brand-horizontal)',
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-sunset': 'var(--gradient-sunset)',
				'gradient-ocean': 'var(--gradient-ocean)'
			},
			boxShadow: {
				'brand': 'var(--shadow-brand)',
				'glow': 'var(--shadow-glow)',
				'soft': 'var(--shadow-soft)',
				'glass': 'var(--shadow-glass)',
				'elevated': 'var(--shadow-elevated)',
				'orange': 'var(--shadow-orange)',
				'red': 'var(--shadow-red)',
				'purple': 'var(--shadow-purple)'
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
