import "./index.less";
import "./dark.less";

// Load every theme stylesheet in this directory automatically so a new theme
// CSS file does not require updating the entry imports.
void import.meta.glob(
  ["./*.less", "!./index.less", "!./dark.less"],
  { eager: true }
);
