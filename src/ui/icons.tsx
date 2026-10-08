const ZONE_PATHS = [
  'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  'M12 2.5 18 11h-3l4 6H5l4-6H6zM12 17v4.5',
  'M3 21V9h6v12M9 21V3h8v18M17 21v-9h4v9M2 21h20M12 7h2M12 11h2M12 15h2',
  'M13 2 4 14h7l-1 8 9-12h-7z',
  'M2 10c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1',
  'M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9.5 4 12 6.5 14.5 4M9.5 20 12 17.5 14.5 20',
  'M12 2.5c3 2.4 4.5 5.8 4.5 9.8l-2 3.7h-5l-2-3.7c0-4 1.5-7.4 4.5-9.8zM9.6 16l-2.4 4.5M14.4 16l2.4 4.5M12 16v5.5M12 8.5v2.5',
]

export function ZoneIcon({ zone, size = 18 }: { zone: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ZONE_PATHS[zone]} />
    </svg>
  )
}

type IconName = 'mail' | 'phone' | 'github' | 'linkedin' | 'file' | 'replay' | 'coin' | 'swap' | 'arrow' | 'left' | 'right' | 'horn' | 'sound' | 'mute'

const PATHS: Record<IconName, string> = {
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
  github:
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  linkedin: 'M4 9h4v12H4zM6 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v1.8c.6-1.1 2-2 3.8-2C21 8.8 21 11.5 21 14v7h-4v-6.2c0-1.5 0-3.3-2-3.3s-2.4 1.6-2.4 3.2V21H10z',
  file: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',
  replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  arrow: 'M12 5v14M6 13l6 6 6-6',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  horn: 'M4 9h3l9-5v16l-9-5H4zM7 15l1.5 5h3l-1.2-4.2M19 9.5a3.5 3.5 0 0 1 0 5',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9.5l5 5M22 9.5l-5 5',
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
