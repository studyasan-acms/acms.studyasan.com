import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar,
    User,
    ArrowRight,
    Search,
    Tag,
    Clock,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// Sample blog data - in production this would come from an API
const sampleBlogs = [
    {
        id: 1,
        title: 'IPS Ravi Sinha, The New Chief of RAW (Research and Analysis Wing)',
        excerpt: 'Learn about the career and achievements of IPS Ravi Sinha, who was appointed as the new chief of R&AW.',
        category: 'Current Affairs',
        author: 'StudyAsan Team',
        date: '2024-12-20',
        readTime: '5 min read',
        image: null,
        featured: true,
    },
    {
        id: 2,
        title: 'Chandrayaan-3 launched by ISRO | Important Facts | Study Material',
        excerpt: 'Complete study material on Chandrayaan-3 mission including important facts, rocket woman, and competitive exam preparation.',
        category: 'Science & Technology',
        author: 'StudyAsan Team',
        date: '2024-12-18',
        readTime: '8 min read',
        image: null,
        featured: true,
    },
    {
        id: 3,
        title: 'India\'s New Parliament House | Central Vista Project',
        excerpt: 'Everything you need to know about India\'s new Parliament House - location, old building, architect, and why it was needed.',
        category: 'Current Affairs',
        author: 'StudyAsan Team',
        date: '2024-12-15',
        readTime: '6 min read',
        image: null,
        featured: false,
    },
    {
        id: 4,
        title: 'How to Prepare for NET/JRF Examination - Complete Guide',
        excerpt: 'A comprehensive guide covering all aspects of NET/JRF preparation including syllabus, study plan, and tips from toppers.',
        category: 'Exam Preparation',
        author: 'Kadimbini Gahtori',
        date: '2024-12-12',
        readTime: '10 min read',
        image: null,
        featured: false,
    },
    {
        id: 5,
        title: 'Effective Study Techniques for Board Exams',
        excerpt: 'Learn proven study techniques and time management strategies to excel in your board examinations.',
        category: 'Study Tips',
        author: 'Deepak Kumar Arya',
        date: '2024-12-10',
        readTime: '7 min read',
        image: null,
        featured: false,
    },
    {
        id: 6,
        title: 'The Importance of Personality Development in Education',
        excerpt: 'Why personality development is as important as academic education and how it helps in overall growth.',
        category: 'Personality Development',
        author: 'StudyAsan Team',
        date: '2024-12-08',
        readTime: '5 min read',
        image: null,
        featured: false,
    },
];

const categories = [
    'All',
    'Current Affairs',
    'Science & Technology',
    'Exam Preparation',
    'Study Tips',
    'Personality Development',
];

export default function BlogPage() {
    const [blogs, setBlogs] = useState(sampleBlogs);
    const [filteredBlogs, setFilteredBlogs] = useState(sampleBlogs);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const blogsPerPage = 6;

    // Filter blogs based on search and category
    useEffect(() => {
        let result = blogs;

        if (searchQuery) {
            result = result.filter(blog =>
                blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategory !== 'All') {
            result = result.filter(blog => blog.category === selectedCategory);
        }

        setFilteredBlogs(result);
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, blogs]);

    // Pagination
    const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
    const currentBlogs = filteredBlogs.slice(
        (currentPage - 1) * blogsPerPage,
        currentPage * blogsPerPage
    );

    const featuredBlogs = blogs.filter(blog => blog.featured).slice(0, 2);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="relative py-24 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center text-white">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Blog & News</h1>
                        <p className="text-xl text-blue-100 leading-relaxed">
                            Stay updated with the latest in education, current affairs, and exam preparation tips.
                        </p>
                    </div>
                </div>
            </section>

            {/* Search & Filter Section */}
            <section className="py-8 bg-white border-b sticky top-20 z-30">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Posts */}
            {selectedCategory === 'All' && !searchQuery && (
                <section className="py-16 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Articles</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            {featuredBlogs.map((blog) => (
                                <article
                                    key={blog.id}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group"
                                >
                                    {/* Placeholder Image */}
                                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-white/50 text-4xl font-bold">StudyAsan</span>
                                        </div>
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full">
                                                Featured
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Tag className="w-4 h-4" />
                                                {blog.category}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {blog.readTime}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {blog.title}
                                        </h3>

                                        <p className="text-gray-600 mb-4 line-clamp-2">{blog.excerpt}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <User className="w-4 h-4" />
                                                <span>{blog.author}</span>
                                                <span>•</span>
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(blog.date)}</span>
                                            </div>
                                            <Link
                                                to={`/blog/${blog.id}`}
                                                className="text-blue-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                                            >
                                                Read More
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* All Posts */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">
                        {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
                        <span className="text-gray-400 font-normal ml-2">({filteredBlogs.length})</span>
                    </h2>

                    {currentBlogs.length > 0 ? (
                        <>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {currentBlogs.map((blog) => (
                                    <article
                                        key={blog.id}
                                        className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group border border-gray-100"
                                    >
                                        {/* Placeholder Image */}
                                        <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 relative">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-white/30 text-2xl font-bold">StudyAsan</span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                                                    {blog.category}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {blog.readTime}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                {blog.title}
                                            </h3>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{blog.excerpt}</p>

                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(blog.date)}
                                                </div>
                                                <Link
                                                    to={`/blog/${blog.id}`}
                                                    className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
                                                >
                                                    Read
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-12">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === i + 1
                                                    ? 'bg-blue-600 text-white'
                                                    : 'border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                            <p className="text-gray-600 mb-6">
                                Try adjusting your search or filter to find what you're looking for.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('All');
                                }}
                                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Subscribe Section */}
            <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Stay Updated with StudyAsan
                    </h2>
                    <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                        Get the latest educational content, exam tips, and current affairs delivered to your inbox.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-grow px-6 py-4 rounded-full outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <button className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full transition-colors whitespace-nowrap">
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
