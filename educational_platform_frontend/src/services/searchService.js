// @ts-nocheck
import postService from './postService';
import userService from './userService';
import communitiesService from './communitiesService';
import jobService from './jobService';
import eventsService from './eventsService';
const emptyBundle = (query) => ({
    query,
    users: [],
    posts: [],
    communities: [],
    jobs: [],
    events: [],
    errors: {},
});
/** Parallel campus-wide search (debounce in the UI). Min 2 characters recommended. */
export async function runGlobalSearch(rawQuery) {
    const query = rawQuery.trim();
    if (query.length < 2) {
        return emptyBundle(query);
    }
    const settled = await Promise.allSettled([
        userService.searchUsers(query, { limit: 5, page: 1 }),
        postService.getPosts({ search: query, limit: 5, page: 1, sort: 'latest' }),
        communitiesService.searchCommunities(query, { limit: 5, page: 1 }),
        jobService.getJobs({ search: query, limit: 5, page: 1 }),
        eventsService.getEvents({ q: query, tab: 'All', limit: 5, page: 1 }),
    ]);
    const out = {
        query,
        users: [],
        posts: [],
        communities: [],
        jobs: [],
        events: [],
        errors: {},
    };
    const keys = [
        'users',
        'posts',
        'communities',
        'jobs',
        'events',
    ];
    settled.forEach((r, i) => {
        const key = keys[i];
        if (r.status === 'fulfilled') {
            const v = r.value;
            if (key === 'users') {
                out.users = v.users || [];
            }
            else if (key === 'posts') {
                out.posts = v.posts || [];
            }
            else if (key === 'communities') {
                out.communities =
                    v.communities || [];
            }
            else if (key === 'jobs') {
                out.jobs = v.jobs || [];
            }
            else if (key === 'events') {
                out.events = v.events || [];
            }
        }
        else {
            const msg = r.reason?.response?.data?.message || r.reason?.message || 'Request failed';
            out.errors[key] = String(msg);
        }
    });
    return out;
}
