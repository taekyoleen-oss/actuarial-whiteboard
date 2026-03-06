import katex from 'katex'

/**
 * KaTeX LaTeX → PNG data URL
 * html2canvas로 페이지 폰트(KaTeX 웹폰트)를 그대로 반영하여 캡처
 */
export async function latexToSVGDataURL(latex: string): Promise<string> {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
    output: 'html',
  })

  // 화면 밖에 렌더링 컨테이너 배치 (폰트 적용을 위해 실제 DOM에 추가)
  const container = document.createElement('div')
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'background-color:#ffffff',
    'color:#000000',
    'padding:6px 14px',
    'display:inline-block',
    'white-space:nowrap',
    'font-size:20px',
  ].join(';')
  container.innerHTML = html
  document.body.appendChild(container)

  // 웹폰트 로드 대기
  await document.fonts.ready

  // html2canvas는 같은 문서 컨텍스트에서 렌더링 → KaTeX 웹폰트 정상 사용.
  // 단, Tailwind v4의 oklch()/color-mix() 색상 함수를 파싱 못 하므로,
  // 캡처 전에 모든 CSS 커스텀 속성을 hex로, outline-color를 transparent로 임시 재정의.
  const tempStyle = document.createElement('style')
  tempStyle.textContent = `
    :root {
      --background:#ffffff; --foreground:#111827;
      --card:#ffffff; --card-foreground:#111827;
      --popover:#ffffff; --popover-foreground:#111827;
      --primary:#1e2d5e; --primary-foreground:#f8fafc;
      --secondary:#f1f5f9; --secondary-foreground:#1e2d5e;
      --muted:#f1f5f9; --muted-foreground:#64748b;
      --accent:#f1f5f9; --accent-foreground:#1e2d5e;
      --destructive:#ef4444; --border:#e2e8f0; --input:#e2e8f0; --ring:#94a3b8;
      --chart-1:#f59e0b; --chart-2:#10b981; --chart-3:#3b82f6;
      --chart-4:#f97316; --chart-5:#eab308;
      --sidebar:#f8fafc; --sidebar-foreground:#111827;
      --sidebar-primary:#1e2d5e; --sidebar-primary-foreground:#f8fafc;
      --sidebar-accent:#f1f5f9; --sidebar-accent-foreground:#1e2d5e;
      --sidebar-border:#e2e8f0; --sidebar-ring:#94a3b8;
    }
    html,body { background-color:#ffffff !important; color:#111827 !important; }
    * { border-color:#e2e8f0 !important; outline-color:transparent !important; }
  `
  document.head.appendChild(tempStyle)

  let dataURL = ''
  try {
    const html2canvas = (await import('html2canvas')).default
    const capturedCanvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    })
    dataURL = capturedCanvas.toDataURL('image/png')
  } finally {
    document.head.removeChild(tempStyle)
    document.body.removeChild(container)
  }
  return dataURL
}

export function validateLatex(latex: string): string | null {
  try {
    katex.renderToString(latex, { throwOnError: true })
    return null
  } catch (err) {
    return err instanceof Error ? err.message : '수식 오류'
  }
}

export function renderLatexPreview(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    })
  } catch {
    return '<span style="color:red">수식 오류</span>'
  }
}
