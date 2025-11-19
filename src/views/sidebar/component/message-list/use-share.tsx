import { useMarkdownRenderer } from "../hooks/use-markdown-renderer";
import ReactMarkdown from "react-markdown";
import ShareCard from "./share-card";

export const useShare = () => {
  const buildMarkdownProps = useMarkdownRenderer();

  const shareToImg = async (question: string, answer: string) => {
    const cardElement = document.createElement("div");
    // Hide the element from the user's view
    cardElement.style.position = "absolute";
    cardElement.style.left = "-9999px";
    cardElement.style.width = "400px";
    document.body.appendChild(cardElement);

    const questionNode = (
      <ReactMarkdown {...(buildMarkdownProps(question) as any)}>
        {question}
      </ReactMarkdown>
    );
    const answerNode = (
      <ReactMarkdown {...(buildMarkdownProps(answer) as any)}>
        {answer}
      </ReactMarkdown>
    );

    const card = <ShareCard question={questionNode} answer={answerNode} />;

    const { default: ReactDOM } = await import("react-dom");
    ReactDOM.render(card, cardElement);

    // Give React time to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const domToImage = (await import("dom-to-image-more")).default;
      const dataUrl = await domToImage.toPng(cardElement, {
        // It is recommended to specify the pixel ratio of the device to ensure the image is clear
        pixelRatio: window.devicePixelRatio,
        // Set a background color to prevent transparency issues
        bgcolor:
          getComputedStyle(document.body)
            .getPropertyValue("--background-primary")
            .trim() || "#ffffff",
        // Copy all styles from the original document to the cloned one
        style: {
          // This ensures that all styles are copied
          ...Object.fromEntries(
            Array.from(document.styleSheets)
              .flatMap((sheet) => Array.from(sheet.cssRules))
              .filter((rule) => rule instanceof CSSStyleRule)
              .map((rule) => [
                (rule as CSSStyleRule).selectorText,
                rule.cssText,
              ])
          ),
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `yoran-chat-share-${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error("Oops, something went wrong!", error);
    } finally {
      document.body.removeChild(cardElement);
    }
  };
  return { shareToImg };
};
