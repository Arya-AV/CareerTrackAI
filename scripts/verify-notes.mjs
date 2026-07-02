const stamp = Date.now();

const request = async (pathName, token, options = {}) => {
  const response = await fetch(`http://localhost:5000${pathName}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${pathName} failed ${response.status}: ${text}`);
  return data;
};

const signup = await request("/api/auth/signup", null, {
  method: "POST",
  body: JSON.stringify({
    name: "Notes Test User",
    email: `notes.${stamp}@example.com`,
    password: `TestPass-${stamp}!`
  })
});

const token = signup.accessToken;

await request("/api/notes", token, {
  method: "POST",
  body: JSON.stringify({
    title: "Two pointer mistake",
    type: "Mistake",
    company: "Acme AI",
    role: "SWE Intern",
    content: "Forgot to sort the array before applying the two pointer pattern.",
    tags: ["dsa", "arrays", "mistake"]
  })
});

await request("/api/notes", token, {
  method: "POST",
  body: JSON.stringify({
    title: "React interview question",
    type: "Interview Question",
    company: "ByteWorks",
    role: "Frontend Intern",
    content: "Explain useEffect cleanup and dependency arrays.",
    tags: ["react", "frontend"]
  })
});

const all = await request("/api/notes", token);
const search = await request("/api/notes?search=cleanup", token);
const tag = await request("/api/notes?tag=react", token);
const tags = await request("/api/notes/tags", token);

console.log(
  JSON.stringify(
    {
      user: signup.user.email,
      allCount: all.notes.length,
      searchTitles: search.notes.map((note) => note.title),
      reactTagTitles: tag.notes.map((note) => note.title),
      tags: tags.tags,
      verified:
        all.notes.length === 2 &&
        search.notes.some((note) => note.title === "React interview question") &&
        tag.notes.length === 1 &&
        tags.tags.includes("react") &&
        tags.tags.includes("dsa")
    },
    null,
    2
  )
);
