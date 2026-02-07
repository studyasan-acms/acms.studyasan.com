import { Link } from 'react-router-dom';
import {
    GraduationCap,
    Briefcase,
    Users,
    Heart,
    ArrowRight,
    CheckCircle,
    Sparkles,
    Globe,
    Clock,
    BookOpen
} from 'lucide-react';

const positions = [
    {
        title: 'Subject Educators',
        department: 'Education',
        type: 'Full-time / Part-time',
        description: 'We are looking for passionate educators for various subjects including Science, Mathematics, English, Social Studies, and more.',
        requirements: [
            'Bachelor\'s degree in relevant subject',
            'Excellent communication skills',
            'Passion for teaching',
            'Experience preferred but not mandatory',
        ],
        icon: BookOpen,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        title: 'Competitive Exam Faculty',
        department: 'Education',
        type: 'Part-time / Freelance',
        description: 'Looking for experts to teach SSC, Bank, Railway, UPSC, UKSSC, and state-level exam preparation.',
        requirements: [
            'Proven track record in competitive exams',
            'Minimum 2 years teaching experience',
            'Strong knowledge of exam patterns',
            'Ability to simplify complex concepts',
        ],
        icon: GraduationCap,
        color: 'from-sky-500 to-blue-500',
    },
    {
        title: 'Personality Development Trainer',
        department: 'Development',
        type: 'Part-time',
        description: 'We need dynamic trainers for personality development and English speaking skills sessions.',
        requirements: [
            'Excellent spoken English',
            'Experience in soft skills training',
            'Engaging presentation skills',
            'Positive and motivating attitude',
        ],
        icon: Sparkles,
        color: 'from-orange-500 to-amber-500',
    },
    {
        title: 'Content Creator / Designer',
        department: 'Technology',
        type: 'Full-time',
        description: 'Creative individuals to develop educational content, graphics, and promotional materials.',
        requirements: [
            'Proficiency in design tools',
            'Strong content writing skills',
            'Creative and innovative mindset',
            'Understanding of educational content',
        ],
        icon: Briefcase,
        color: 'from-emerald-500 to-teal-500',
    },
];

const benefits = [
    {
        icon: Heart,
        title: 'Meaningful Work',
        description: 'Make a real difference in students\' lives by being part of their educational journey.',
    },
    {
        icon: Globe,
        title: 'Work from Anywhere',
        description: 'Join us from any part of India - we connect mentors from villages and cities.',
    },
    {
        icon: Users,
        title: 'Supportive Team',
        description: 'Be part of a growing team that believes in helping each other succeed.',
    },
    {
        icon: Clock,
        title: 'Flexible Hours',
        description: 'Choose your schedule and work at times that suit you best.',
    },
];

import { usePageTitle } from "@/hooks/usePageTitle";

export default function CareerPage() {
    usePageTitle("Careers");
    return (
        <div>
            {/* Hero Section */}
            <section className="relative py-24 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center text-white">
                        <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6">
                            Anytime, Anywhere
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Career With Us</h1>
                        <p className="text-xl text-blue-100 leading-relaxed">
                            A calling for educators, awakeners, and mentors!
                        </p>
                    </div>
                </div>
            </section>

            {/* Be an Icon Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <span className="inline-block px-4 py-1 bg-amber-100 text-amber-600 rounded-full text-sm font-medium mb-4">
                            Join Our Mission
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            Be an Icon for Imparting Knowledge and Inspire Change
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            Spreading all over India, we have bulked up with the stockroom of smart knowledge
                            along with the best faculty and experts. We are looking for passionate individuals
                            who share our vision of making quality education accessible to everyone.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="https://forms.gle/NnAC1SFLB9pUv6XT8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-full shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                Apply Now
                                <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Why Join StudyAsan
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            Grow With Us
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <benefit.icon className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                                <p className="text-gray-600">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Open Positions */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Open Positions
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            Current Opportunities
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Find the perfect role that matches your skills and passion.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {positions.map((position, index) => (
                            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${position.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        <position.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{position.title}</h3>
                                        <p className="text-gray-500 text-sm">
                                            {position.department} • {position.type}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-gray-600 mb-6">{position.description}</p>

                                <div className="space-y-2 mb-6">
                                    <h4 className="font-semibold text-gray-900 text-sm">Requirements:</h4>
                                    {position.requirements.map((req, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{req}</span>
                                        </div>
                                    ))}
                                </div>

                                <a
                                    href="https://forms.gle/NnAC1SFLB9pUv6XT8"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                                >
                                    Apply for this position
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Don't See Your Role?
                    </h2>
                    <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                        We're always looking for talented individuals. Send us your resume
                        and we'll reach out when we have a suitable opportunity.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="mailto:studyasaneducation@gmail.com?subject=Career Inquiry"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                        >
                            Send Your Resume
                        </a>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white hover:bg-white/10 transition-colors"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
