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

  // html-to-image: DOM을 SVG foreignObject로 직렬화 후 브라우저가 직접 렌더링.
  // html2canvas와 달리 oklch()/color-mix() 등 현대 CSS를 브라우저가 처리하므로 색상 파싱 에러 없음.
  let dataURL = ''
  try {
    const { toPng } = await import('html-to-image')
    dataURL = await toPng(container, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    })
  } finally {
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
