function toPlain(row) {
  return row.get ? row.get({ plain: true }) : { ...row };
}

function buildCommentTree(comments) {
  const byId = new Map();
  const roots = [];
  comments.forEach((row) => {
    const c = toPlain(row);
    c.replies = [];
    byId.set(String(c.id), c);
  });
  byId.forEach((c) => {
    if (c.parent_comment_id && byId.has(String(c.parent_comment_id))) {
      byId.get(String(c.parent_comment_id)).replies.push(c);
    } else if (!c.parent_comment_id) {
      roots.push(c);
    }
  });
  const sortReplies = (list, asc = true) => {
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return asc ? ta - tb : tb - ta;
    });
    list.forEach((n) => sortReplies(n.replies || [], asc));
  };
  return { roots, byId };
}

function countRepliesDeep(node) {
  const replies = node.replies || [];
  return replies.reduce((sum, r) => sum + 1 + countRepliesDeep(r), 0);
}

function sortRootComments(roots, sort = 'latest') {
  const list = [...roots];
  if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sort === 'top') {
    list.sort((a, b) => {
      const scoreA = (a.likes_count || 0) * 2 + countRepliesDeep(a);
      const scoreB = (b.likes_count || 0) * 2 + countRepliesDeep(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const ascReplies = sort !== 'top';
  list.forEach((root) => {
    const sortReplies = (nodes) => {
      nodes.sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return ascReplies ? ta - tb : tb - ta;
      });
      nodes.forEach((n) => sortReplies(n.replies || []));
    };
    sortReplies(root.replies || []);
  });
  return list;
}

function collectDescendantIds(allRows, rootId) {
  const childrenByParent = new Map();
  allRows.forEach((c) => {
    const pid = c.parent_comment_id ? String(c.parent_comment_id) : '';
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    childrenByParent.get(pid).push(String(c.id));
  });
  const ids = [];
  const stack = [String(rootId)];
  while (stack.length) {
    const node = stack.pop();
    ids.push(node);
    (childrenByParent.get(node) || []).forEach((id) => stack.push(id));
  }
  return ids;
}

module.exports = {
  buildCommentTree,
  sortRootComments,
  countRepliesDeep,
  collectDescendantIds,
};
