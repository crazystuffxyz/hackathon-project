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