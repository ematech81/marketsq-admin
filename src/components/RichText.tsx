/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from "react-markdown";
import type { ComponentProps } from "react";

type Props<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & { node?: unknown };

// Shows a product description written in Markdown: headings, bold, italics, lists and links.
// Raw HTML is never rendered, so a description cannot inject anything harmful.
//
// A page should have one main heading (H1), and that is the product name. So a "#" heading in a description
// is shown as an H2, "##" as an H3 and "###" as an H4. This keeps the page structure clean for Google.
export default function RichText({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-[#45474B]">
      <ReactMarkdown
        components={{
          h1: ({ node: _n, ...p }: Props<"h2">) => <h2 {...p} className="mt-2 font-display text-2xl font-semibold text-foreground" />,
          h2: ({ node: _n, ...p }: Props<"h3">) => <h3 {...p} className="mt-2 font-display text-xl font-semibold text-foreground" />,
          h3: ({ node: _n, ...p }: Props<"h4">) => <h4 {...p} className="mt-1 font-display text-lg font-semibold text-foreground" />,
          h4: ({ node: _n, ...p }: Props<"h4">) => <h4 {...p} className="font-display text-base font-semibold text-foreground" />,
          p: ({ node: _n, ...p }: Props<"p">) => <p {...p} />,
          strong: ({ node: _n, ...p }: Props<"strong">) => <strong {...p} className="font-semibold text-foreground" />,
          ul: ({ node: _n, ...p }: Props<"ul">) => <ul {...p} className="list-disc space-y-1 pl-6" />,
          ol: ({ node: _n, ...p }: Props<"ol">) => <ol {...p} className="list-decimal space-y-1 pl-6" />,
          a: ({ node: _n, href, ...p }: Props<"a">) => {
            const external = typeof href === "string" && /^https?:\/\//i.test(href);
            return external ? (
              <a {...p} href={href} target="_blank" rel="nofollow noopener noreferrer ugc" className="font-semibold text-accent-ink underline" />
            ) : (
              <a {...p} href={href} className="font-semibold text-accent-ink underline" />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
