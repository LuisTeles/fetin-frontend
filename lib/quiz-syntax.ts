/**
 * Client-side mirror of the backend's quiz parser (Fetin-backend/src/assignments/quiz.util.ts),
 * used ONLY for live hints and the professor's preview. The server stays authoritative for
 * validation and is the only place a score is ever computed.
 */

export const QUIZ_TEMPLATE = [
    "# Título da revisão",
    "Escreva aqui o material de estudo em markdown.",
    "",
    "```quiz",
    "Q1 (2 pts): Pergunta de escolha única?",
    "- [ ] Opção errada",
    "- [x] Opção certa",
    "- [ ] Outra errada",
    "",
    "Q2 (1 pt): Pergunta de múltipla escolha (marque todas as certas).",
    "- [x] Certa",
    "- [x] Também certa",
    "- [ ] Errada",
    "```",
].join("\n")

export interface DraftQuestion {
    prompt: string
    points: number
    options: string[]
    multi: boolean
}

export interface DraftQuiz {
    material: string
    questions: DraftQuestion[]
    totalPoints: number
    error: string | null
}

const BLOCK = /^```quiz[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/m
const FENCE_LINE = /^```quiz/gm
const KEY_LINE = /^\s*-\s*\[[xX]\]/m
const HEADER = /^Q(\d+)(?:\s*\((\d+)\s*pts?\))?\s*:\s*(.+)$/i
const OPTION = /^-\s*\[( |x|X)\]\s*(.+)$/

export function parseDraftQuiz(markdown: string): DraftQuiz {
    const match = BLOCK.exec(markdown)
    if (!match) return { material: markdown.trim(), questions: [], totalPoints: 0, error: "Inclua um bloco ```quiz com ao menos uma questão." }
    const material = (markdown.slice(0, match.index) + markdown.slice(match.index + match[0].length)).trim()
    // Mirrors the server: a second block or a stray [x] in the material would expose the key.
    if ((markdown.match(FENCE_LINE) ?? []).length > 1) {
        return { material, questions: [], totalPoints: 0, error: "Use um único bloco ```quiz, no final do conteúdo." }
    }
    if (KEY_LINE.test(material)) {
        return { material, questions: [], totalPoints: 0, error: "O material não pode conter opções marcadas com [x]; elas só valem dentro do bloco ```quiz." }
    }

    const questions: (DraftQuestion & { correct: number })[] = []
    let error: string | null = null
    let current: (DraftQuestion & { correct: number }) | null = null
    for (const raw of match[1].split(/\r?\n/)) {
        const line = raw.trim()
        if (!line) continue
        const header = HEADER.exec(line)
        if (header) {
            current = { prompt: header[3].trim(), points: header[2] === undefined ? 1 : Number(header[2]), options: [], multi: false, correct: 0 }
            questions.push(current)
            continue
        }
        const option = OPTION.exec(line)
        if (option && current) {
            if (option[1] !== " ") current.correct++
            current.options.push(option[2].trim())
            continue
        }
        error ??= `Linha inválida no quiz: "${line}"`
    }
    if (!error && questions.length > 50) error = "O quiz pode ter no máximo 50 questões."
    if (!error) {
        for (const [i, q] of questions.entries()) {
            if (q.points < 1 || q.points > 100) { error = `Q${i + 1}: pontos devem ficar entre 1 e 100.`; break }
            if (q.options.length < 2) { error = `Q${i + 1}: informe ao menos 2 opções.`; break }
            if (q.options.length > 50) { error = `Q${i + 1}: no máximo 50 opções.`; break }
            if (q.correct < 1) { error = `Q${i + 1}: marque ao menos uma opção correta com [x].`; break }
        }
    }
    if (!error && questions.length === 0) error = "Inclua ao menos uma questão no quiz."
    for (const q of questions) q.multi = q.correct > 1
    return {
        material,
        questions: questions.map(({ prompt, points, options, multi }) => ({ prompt, points, options, multi })),
        totalPoints: questions.reduce((n, q) => n + q.points, 0),
        error,
    }
}
