// @ts-nocheck
import api from './api';

class JobService {
    async createJob(data) {
        const hasFile = data.company_logo instanceof File;
        if (hasFile) {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('company_name', data.company_name);
            formData.append('job_type', data.job_type);
            formData.append('description', data.description);
            if (data.category) formData.append('category', data.category);
            if (data.location) formData.append('location', data.location);
            if (data.apply_url) formData.append('apply_url', data.apply_url);
            if (data.visibility) formData.append('visibility', data.visibility);
            formData.append('is_remote', String(Boolean(data.is_remote)));
            if (data.experience_level) formData.append('experience_level', data.experience_level);
            if (data.education_level) formData.append('education_level', data.education_level);
            if (data.salary_range) formData.append('salary_range', JSON.stringify(data.salary_range));
            if (data.application_deadline) formData.append('application_deadline', data.application_deadline);
            formData.append('company_logo', data.company_logo);
            const response = await api.post('/jobs', formData);
            if (response.data.status && response.data.data) return response.data.data;
            return response.data;
        }
        const response = await api.post('/jobs', data);
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    }

    async getJobs(params) {
        const response = await api.get('/jobs', { params });
        if (response.data.status && response.data.data) {
            return {
                jobs: response.data.data.jobs || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1,
            };
        }
        return response.data;
    }

    async getTrendingJobs(params = {}) {
        const response = await api.get('/jobs/trending', { params });
        if (response.data.status && response.data.data) {
            return {
                jobs: response.data.data.jobs || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1,
            };
        }
        return { jobs: [], total: 0, page: 1, totalPages: 1 };
    }

    async getJob(id) {
        const response = await api.get(`/jobs/${id}`);
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    }

    async updateJob(id, data) {
        const response = await api.put(`/jobs/${id}`, data);
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    }

    async deleteJob(id) {
        await api.delete(`/jobs/${id}`);
    }

    async applyForJob(jobId, data) {
        const formData = new FormData();
        if (data.resume) formData.append('resume', data.resume);
        if (data.cover_letter) formData.append('cover_letter', data.cover_letter);
        if (data.portfolio_url) formData.append('portfolio_url', data.portfolio_url);
        if (data.linkedin_url) formData.append('linkedin_url', data.linkedin_url);
        if (data.github_url) formData.append('github_url', data.github_url);
        if (data.expected_salary) formData.append('expected_salary', JSON.stringify(data.expected_salary));
        if (data.availability_date) formData.append('availability_date', data.availability_date);
        if (data.additional_notes) formData.append('additional_notes', data.additional_notes);
        const response = await api.post(`/jobs/${jobId}/apply`, formData);
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    }

    async getJobApplications(jobId, params) {
        const response = await api.get(`/jobs/${jobId}/applications`, { params });
        if (response.data.status && response.data.data) {
            return {
                applications: response.data.data.applications || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1,
            };
        }
        return response.data;
    }

    async updateApplicationStatus(jobId, applicationId, status, feedback) {
        const response = await api.put(`/jobs/${jobId}/applications/${applicationId}/status`, {
            status,
            feedback,
        });
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    }

    async getUserApplications(params) {
        const response = await api.get('/jobs/applications/my', { params });
        if (response.data.status && response.data.data) {
            return {
                applications: response.data.data.applications || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1,
            };
        }
        return response.data;
    }

    async getPopularJobSkills() {
        const response = await api.get('/jobs/popular-skills');
        if (response.data.status && response.data.data) {
            return {
                skills: response.data.data.popular_skills?.map((item) => item.skill) || [],
                tags: response.data.data.popular_tags?.map((item) => item.tag) || [],
            };
        }
        return response.data;
    }

    async getJobStats() {
        const response = await api.get('/jobs/stats');
        if (response.data.status && response.data.data) {
            const data = response.data.data;
            const received = typeof data.applications_received === 'number' ? data.applications_received : 0;
            return {
                posted_jobs: data.posted_jobs?.total || 0,
                total_applications: data.applications?.total || 0,
                active_jobs: data.posted_jobs?.active || 0,
                applications_received: received,
            };
        }
        return response.data;
    }
}

export default new JobService();
