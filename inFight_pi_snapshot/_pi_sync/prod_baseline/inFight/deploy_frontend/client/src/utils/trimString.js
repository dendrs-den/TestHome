const trimString = (string, size , dots = false) => {
  if (typeof string !== 'string') {
    throw new Error(
      `${string} не является строкой. Тип переданной строки: ${typeof string}`,
    );
  }
  const trimmedString = string.trim();

  return trimmedString.length <= size
    ? trimmedString
    : `${trimmedString.slice(0, size)}${dots ? '...' : ''}`;
};

export default  trimString;