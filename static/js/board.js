let currentUser = null;
let editingPostId = null;

function renderReviews(posts) {
    const feed = document.getElementById("posts-feed");
    feed.innerHTML = "";
    if (posts.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No reviews yet.";
        feed.appendChild(empty);
        return;
    }
    posts.forEach(post => {
        const card = document.createElement("article");
        card.className = "post-card";
        const top = document.createElement("div");
        top.className = "post-card-top";

        const details = document.createElement("div");
        details.className = "post-meta-details";
        const teacher = document.createElement("span");
        teacher.textContent = "Instructor: ";

        const teacherName = document.createElement("strong");
        teacherName.textContent = post.teacher;
        const dot1 = document.createElement("span");
        dot1.textContent = "·";

        const course = document.createElement("span");
        course.textContent = "Course: ";
        const courseName = document.createElement("strong");
        courseName.textContent = post.course || "Not specified";
        course.appendChild(courseName);

        const dot2 = document.createElement("span");
        dot2.textContent = "·";

        const workload = document.createElement("span");
        workload.textContent = `Workload: ${post.workload}`;
        const rating = document.createElement("span");
        rating.className = "review-rating";
        rating.textContent =
            "★".repeat(post.rating) + "☆".repeat(5 - post.rating);

        teacher.appendChild(teacherName);
        const difficulty = document.createElement("span");
        difficulty.textContent = `Difficulty: ${post.difficulty || "Not specified"}`;
        const takeAgain = document.createElement("span");
        takeAgain.textContent = `Take again: ${post.take_again || "Not specified"}`;
        details.append(teacher, dot1, course, dot2, workload, difficulty, takeAgain);     
        top.append(details, rating);
        card.appendChild(top);
        const body = document.createElement("div");
        body.className = "post-body";
        const text = document.createElement("p");
        text.className = "post-text";
        text.textContent = post.text || "No written review.";
        body.appendChild(text);
        const footer = document.createElement("div");
        footer.className = "post-actions";
        const author = document.createElement("span");
        author.textContent = `By @${post.handle} · ${post.likes ?? 0} likes`;
        author.style.fontSize = "12px";
        author.style.color = "var(--muted)";
        footer.appendChild(author);
        const likeButton = document.createElement("button");
        likeButton.type = "button";
        likeButton.className = "button button-quiet";
        likeButton.textContent = post.liked ? "♥ Liked" : "♡ Like";
        likeButton.setAttribute("aria-pressed", String(Boolean(post.liked)));
        footer.appendChild(likeButton);
        if (currentUser && post.handle === currentUser.handle) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "button button-quiet";
            editButton.textContent = "Edit";
            footer.appendChild(editButton);
            editButton.addEventListener("click", () => {
                editingPostId = post.id;
                const form = document.getElementById("review-form");
                for (const field of ["teacher", "course", "text", "rating",
                                    "difficulty", "workload", "take_again"]) {
                    form.elements.namedItem(field).value = post[field] ?? "";
                }
                    document.getElementById("review-submit").textContent = "Save changes";
                        document.getElementById("review-status").textContent = "";
                        const section = form.closest("details");
                        section.open = true;
                        section.scrollIntoView({ behavior: "smooth" });
                        document.getElementById("review-cancel").hidden = false;
                    });
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "button button-quiet";
            deleteButton.textContent = "Delete";
            footer.appendChild(deleteButton);
            deleteButton.addEventListener("click", async () => {
            if (!confirm(`Delete your review of ${post.teacher}? This cannot be undone.`)) {
                return;
            }
            deleteButton.disabled = true;
            try {
                            const response = await fetch(`/api/posts/${post.id}`, {
                method: "DELETE"
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Could not delete review.");
            }
            if (editingPostId === post.id) {
                document.getElementById("review-cancel").click();
            }
                    await loadReviews();
                } catch (error) {
                    alert(error.message);
                    deleteButton.disabled = false;
                }
            });
        }
        likeButton.addEventListener("click", async () => {
        likeButton.disabled = true;
        try {
            const response = await fetch(`/api/posts/${post.id}/like`, {
                method: "POST"
            });
            if (!response.ok) {
                throw new Error("Could not update your like. Please try again.");
            }
                const updated = await response.json();
                post.likes = updated.likes;
                post.liked = updated.liked;
                author.textContent = `By @${post.handle} · ${post.likes} likes`;
                likeButton.textContent = post.liked ? "♥ Liked" : "♡ Like";
                likeButton.setAttribute("aria-pressed", String(Boolean(post.liked)));
                    } catch (error) {
                alert(error.message);
            } finally {
                likeButton.disabled = false;
            }
        });
        body.appendChild(footer);
        card.appendChild(body);
        feed.appendChild(card);
    });
}

function renderTeachers(posts) {
    const list = document.getElementById("teacher-summary-list");
    list.replaceChildren();
    const names = [...new Set(posts.map(post => post.teacher).filter(Boolean))];
    names.forEach(name => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "teacher-summary button button-quiet";
        button.dataset.teacher = name;
        button.textContent = name;
        list.appendChild(button);
    });
}

async function loadReviews() {
    const session = await fetch("/api/me");
        if (!session.ok) throw new Error("Could not check your account.");
        currentUser = (await session.json()).user;
    const sort = document.getElementById("review-sort").value;
    const response = await fetch(`/api/posts?sort=${encodeURIComponent(sort)}`);

    if (!response.ok) {
        throw new Error(response.status === 401
            ? "Please log in to view reviews."
            : "Could not load reviews. Please refresh to try again.");
    }

    const posts = await response.json();
    console.log("Real reviews:", posts);
    window.home.posts = posts;
    renderReviews(posts);
    filterReviews();
    await window.HarvestExplorer.refreshData();
    renderTeachers(posts);
}

loadReviews().catch(error => {
    const feed = document.getElementById("posts-feed");
    feed.textContent = error.message;
    document.getElementById("search-empty").hidden = true;
});

const sortSelect = document.getElementById("review-sort");
sortSelect.addEventListener("change", async () => {
    sortSelect.disabled = true;
    try {
        await loadReviews();
    } catch (error) {
        alert(error.message);
    } finally {
        sortSelect.disabled = false;
    }
});

const reviewForm = document.getElementById("review-form");
const submitButton = document.getElementById("review-submit");
const reviewStatus = document.getElementById("review-status");
reviewForm.addEventListener("submit", async event => {
event.preventDefault();
submitButton.disabled = true;
reviewStatus.textContent = "Posting review...";
    try {
    const editing = editingPostId !== null;
    const url = editing ? `/api/posts/${editingPostId}` : "/api/posts";
    const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        body: new FormData(reviewForm)
    });
    const result = await response.json();
    if (!response.ok) {
         throw new Error(result.error || "Could not post your review.");
    }
    editingPostId = null;
    submitButton.textContent = "Post review";
    document.getElementById("review-cancel").hidden = true;
        reviewForm.reset();
    reviewStatus.textContent = editing ? "Changes saved!" : "Review posted!";    document.getElementById("review-search").value = "";
    document.getElementById("review-sort").value = "newest";
    try {
        await loadReviews();
    } catch {
            reviewStatus.textContent = editing ? "Changes saved!" : "Review posted!";
    }
        } catch (error) {
        reviewStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});
submitButton.disabled = false;

document.getElementById("review-cancel").addEventListener("click", () => {
    editingPostId = null;
    reviewForm.reset();
    submitButton.textContent = "Post review";
    reviewStatus.textContent = "";
    document.getElementById("review-cancel").hidden = true;
});