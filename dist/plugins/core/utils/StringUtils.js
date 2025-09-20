function UUID() {
  return Math.floor(Math.random() * 1e6).toString();
}
function StringFindAllBetween(source, start, end, exclusive = true) {
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`, "gs");
  const matches = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    if (exclusive) matches.push(match[1]);
    else matches.push(start + match[1] + end);
  }
  return matches;
}

export { StringFindAllBetween, UUID };
