/**
 * Declension helper for Russian names to accusative case (винительный падеж)
 * Used when saying "Сказка для [name]" - the name should be in accusative case
 */
export function declineNameAccusative(name: string): string {
  // Handle edge cases
  if (!name || name.length === 0) return name;

  const lower = name.toLowerCase();
  const lastChar = lower[lower.length - 1];
  const lastTwo = lower.slice(-2);

  // Names ending in -а become -у (Маша → Машу)
  if (lastChar === "а") {
    return name.slice(0, -1) + "у";
  }

  // Names ending in -я become -ю (Мария → Марию)
  if (lastChar === "я") {
    return name.slice(0, -1) + "ю";
  }

  // Names ending in -й become -я (Сергей → Сергея)
  if (lastChar === "й") {
    return name.slice(0, -1) + "я";
  }

  // Male names ending in consonants or -о typically add -а in accusative
  // (Максим → Максима, Антон → Антона, Игорь → Игоря)
  if (
    (lastChar >= "б" && lastChar <= "з") ||
    (lastChar >= "к" && lastChar <= "н") ||
    (lastChar >= "п" && lastChar <= "т") ||
    (lastChar >= "ф" && lastChar <= "ш") ||
    lastChar === "щ" ||
    (lastChar >= "х" && lastChar <= "ц") ||
    lastChar === "ч"
  ) {
    return name + "а";
  }

  // Default: return as is (names ending in -о, -е, etc.)
  return name;
}
