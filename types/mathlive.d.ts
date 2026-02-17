import type { DetailedHTMLProps, HTMLAttributes } from "react"

type HtmlElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
type MathMlElementProps = HtmlElementProps & { xmlns?: string }
type MathFieldProps = HtmlElementProps & {
    placeholder?: string
    multiline?: boolean
    "default-mode"?: string
    "smart-mode"?: boolean
}

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "math-field": MathFieldProps
            math: MathMlElementProps
            mrow: MathMlElementProps
            mi: MathMlElementProps
            mo: MathMlElementProps
            mn: MathMlElementProps
            msup: MathMlElementProps
        }
    }
}
