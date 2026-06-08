export function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("splitsync_theme");
        var theme =
          stored === "light" || stored === "dark"
            ? stored
            : window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
