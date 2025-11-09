import { useEffect, useState } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    
    setIsMobile(mobileRegex.test(userAgent))
  }, [])

  return isMobile
}