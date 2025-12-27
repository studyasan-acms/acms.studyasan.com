import { Link } from 'react-router-dom';
import {
    GraduationCap,
    Users,
    BookOpen,
    Trophy,
    CheckCircle,
    ArrowRight,
    Star,
    Sparkles,
    Target,
    Lightbulb,
    Heart,
    Globe
} from 'lucide-react';

const services = [
    {
        icon: Sparkles,
        title: 'Kids Classes',
        description: 'Reading, Speaking & All Subjects tuition for young learners',
        color: 'from-pink-500 to-rose-500',
        shadowColor: 'shadow-pink-500/25',
    },
    {
        icon: BookOpen,
        title: 'Grade 4-8',
        description: 'Comprehensive all-subject tuition with personalized attention',
        color: 'from-purple-500 to-violet-500',
        shadowColor: 'shadow-purple-500/25',
    },
    {
        icon: Target,
        title: 'Grade 9-10',
        description: 'Board exam preparation with expert guidance and practice tests',
        color: 'from-blue-500 to-cyan-500',
        shadowColor: 'shadow-blue-500/25',
    },
    {
        icon: GraduationCap,
        title: 'Grade 11-12',
        description: 'Science, Commerce & Arts streams with specialized faculty',
        color: 'from-emerald-500 to-teal-500',
        shadowColor: 'shadow-emerald-500/25',
    },
    {
        icon: Trophy,
        title: 'NET/JRF Preparation',
        description: 'Comprehensive preparation for national eligibility tests',
        color: 'from-orange-500 to-amber-500',
        shadowColor: 'shadow-orange-500/25',
    },
    {
        icon: Lightbulb,
        title: 'Competitive Exams',
        description: 'SSC, Bank, Railway, UPSC, UKSSC and state-level exams',
        color: 'from-red-500 to-pink-500',
        shadowColor: 'shadow-red-500/25',
    },
];

const stats = [
    { number: '5000+', label: 'Students Taught', icon: Users },
    { number: '100+', label: 'Expert Teachers', icon: GraduationCap },
    { number: '50+', label: 'Courses Offered', icon: BookOpen },
    { number: '95%', label: 'Success Rate', icon: Trophy },
];

const features = [
    'Self-assessment & Group assessment',
    'Training by Professionals',
    'Free Basic English Speaking Skills',
    'Free Basic Personality Development',
    'Online & Offline Classes',
    'One-on-one Mentorship',
];

const testimonials = [
    {
        name: 'Priya Sharma',
        role: 'Class 12 Student',
        content: 'StudyAsan helped me score 95% in my boards. The teachers are incredibly supportive and the study material is excellent.',
        avatar: 'PS',
    },
    {
        name: 'Rahul Kumar',
        role: 'NET Qualified',
        content: 'I cleared NET in my first attempt thanks to StudyAsan. The structured approach and mock tests made all the difference.',
        avatar: 'RK',
    },
    {
        name: 'Anjali Rawat',
        role: 'Parent',
        content: 'My son\'s grades improved significantly after joining StudyAsan. The personalized attention they provide is remarkable.',
        avatar: 'AR',
    },
];

export default function HomePage() {
    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>

                    {/* Grid Pattern */}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='2' cy='2' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    ></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-white space-y-8">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                                <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                                <span>Trusted by 5000+ Students across India</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                Invest in Knowledge
                                <span className="block mt-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                    The Path to Success
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-xl">
                                StudyAsan is devoted to perfection in teaching and learning.
                                We provide quality education with free basic English speaking skills
                                and personality development classes.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to="/register"
                                    className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-full shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    to="/about"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 transition-all duration-300"
                                >
                                    Learn More
                                </Link>
                            </div>

                            {/* Quick Features */}
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                {features.slice(0, 4).map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2 text-blue-100">
                                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                        <span className="text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hero Image/Illustration */}
                        <div className="hidden lg:block relative">
                            <div className="relative w-full max-w-lg mx-auto">
                                {/* Floating Cards */}
                                <div className="absolute -top-10 -left-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl animate-float">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                                            <Trophy className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">95%</p>
                                            <p className="text-blue-200 text-sm">Success Rate</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-5 -right-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl animate-float-delayed">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                                            <Users className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">5000+</p>
                                            <p className="text-blue-200 text-sm">Happy Students</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Image Container */}
                                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
                                    <img
                                        src="/studyasan-logo-lady.png"
                                        alt="StudyAsan Education"
                                        className="w-full h-auto rounded-2xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave Shape */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                                    <stat.icon className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.number}</h3>
                                <p className="text-gray-600">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="py-20 bg-gradient-to-b from-white to-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Our Services
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Why Join Us?
                        </h2>
                        <p className="text-gray-600 text-lg">
                            We offer comprehensive education services from kids to competitive exams
                            with a focus on holistic development.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <div
                                key={index}
                                className={`group bg-white rounded-2xl p-8 shadow-lg ${service.shadowColor} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100`}
                            >
                                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} mb-6 group-hover:scale-110 transition-transform`}>
                                    <service.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block px-4 py-1 bg-white/10 text-blue-200 rounded-full text-sm font-medium mb-4">
                                Why Choose Us
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                Training by Professionals
                            </h2>
                            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                                "Play is culturally determined" - Lynneth Solis. We believe in investigating
                                multiple skills within you to help you do better in life. Understanding your
                                state of knowledge gives both direction and meaning to your life.
                            </p>

                            <div className="space-y-4">
                                {features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-white">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Link
                                to="/about"
                                className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-white text-blue-900 font-semibold rounded-full hover:bg-blue-50 transition-colors"
                            >
                                Learn More About Us
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>

                        <div className="hidden lg:grid grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                                    <Globe className="w-10 h-10 text-cyan-400 mb-4" />
                                    <h4 className="text-white font-bold text-lg mb-2">Pan-India Reach</h4>
                                    <p className="text-blue-200 text-sm">Connecting mentors and students from all over India</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                                    <Heart className="w-10 h-10 text-pink-400 mb-4" />
                                    <h4 className="text-white font-bold text-lg mb-2">Personalized Care</h4>
                                    <p className="text-blue-200 text-sm">One-on-one attention for every student</p>
                                </div>
                            </div>
                            <div className="space-y-6 mt-12">
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                                    <Target className="w-10 h-10 text-orange-400 mb-4" />
                                    <h4 className="text-white font-bold text-lg mb-2">Goal Oriented</h4>
                                    <p className="text-blue-200 text-sm">Focused preparation for exams and career</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                                    <Lightbulb className="w-10 h-10 text-yellow-400 mb-4" />
                                    <h4 className="text-white font-bold text-lg mb-2">Skill Development</h4>
                                    <p className="text-blue-200 text-sm">Linguistic skills and personality enhancement</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Testimonials
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            What Our Students Say
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Hear from our successful students who achieved their dreams with StudyAsan.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                                        <p className="text-gray-500 text-sm">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Start Your Learning Journey?
                    </h2>
                    <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                        Join thousands of students who have achieved success with StudyAsan.
                        Get personalized guidance from expert teachers.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                        >
                            Get Started Free
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white hover:bg-white/10 transition-colors"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>

            {/* Add Custom Animations */}
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
      `}</style>
        </div>
    );
}
