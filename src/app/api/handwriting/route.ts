import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mode = 'formula' } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지 데이터가 없습니다.' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    const formulaPrompt = `이 화이트보드 이미지에서 손으로 쓴 숫자, 수식, 보험수리 기호를 정확하게 인식하여 추출해주세요.

규칙:
- 숫자와 수학 기호를 최우선으로 인식 (0~9, +, -, ×, ÷, =, ∑, ∫, ∞ 등)
- 수식은 반드시 LaTeX 형식으로 변환:
    - 첨자: $_{n}p_x$ (n|p_x), $_{n}q_x$, $_{n}E_x$
    - 보험료: $A_x$, $A_{x:n}$, $\\bar{A}_x$
    - 연금: $\\ddot{a}_x$, $a_{x:n}$, $\\bar{a}_x$
    - 생존확률: \${}_np_x, \${}_nq_x, $\\mu_x$
    - 이자: $v^n$, $\\delta$, $i$, $d$
    - 기댓값: $E[T]$, $e_x$, $\\mathring{e}_x$
- 한국어 텍스트는 그대로 출력
- 분수, 제곱, 루트 등 수식 구조를 정확히 변환 (예: $\\frac{a}{b}$, $x^2$, $\\sqrt{n}$)
- 불확실한 부분은 [?]로 표시
- 배경 선, 도형은 무시하고 텍스트·수식만 추출
- 추출된 내용만 출력하고 부가 설명 없이 종료`

    const textPrompt = `이 이미지에서 손으로 쓴 한국어와 영어 텍스트를 정확하게 인식하여 출력해주세요.

규칙:
- 필기체 한글과 영문을 그대로 텍스트로 변환
- 수식이나 LaTeX 변환 없이 보이는 글자 그대로 출력
- 줄바꿈은 실제 줄바꿈으로 표현
- 불확실한 글자는 [?]로 표시
- 인식된 텍스트만 출력하고 부가 설명 없이 종료`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: mode === 'text' ? textPrompt : formulaPrompt,
            },
          ],
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Handwriting recognition error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '필기 인식 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
