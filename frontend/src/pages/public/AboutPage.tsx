import {
    Target,
    Eye,
    Lightbulb,
    Users,
    GraduationCap,
    Globe,
    Heart,
    Award,
    BookOpen,
    Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from "@/hooks/usePageTitle";

const missionPoints = [
    'To become one of the most effective agencies in India to promote quality education.',
    'To impart social transformation through enhancing the individual skills of each student and encouraging acceptance of their guardians towards these skills.',
    'Along with quality education, we aim to enhance the linguistic skills and personality of a student.',
];

const visionPoints = [
    'To engage with children from different and extreme areas nationwide for their overall systematic development without discrimination based on any factor.',
    'Give access to all for high-quality education.',
    'Assembling quality-based teachers from all over the world.',
    'Ensuring guardians about the secure future of students.',
];

const values = [
    {
        icon: Heart,
        title: 'Passion for Teaching',
        description: 'We believe that teaching is more than just a job - it\'s a calling to help people through education.',
        color: 'from-orange-500 to-red-500',
    },
    {
        icon: Globe,
        title: 'No Boundaries',
        description: 'Spreading knowledge with leaving no boundaries untouched, reaching students from all over India.',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Lightbulb,
        title: 'Techno-Based Education',
        description: 'Advanced efforts and technology-based education as essential boosters for a knowledgeable surrounding.',
        color: 'from-yellow-500 to-orange-500',
    },
    {
        icon: Users,
        title: 'Community Building',
        description: 'Connecting mentors from villages and cities with students from diverse places across India.',
        color: 'from-sky-500 to-cyan-500',
    },
];

export default function AboutPage() {
    usePageTitle("About Us");
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">About StudyAsan</h1>
                        <p className="text-xl text-blue-100 leading-relaxed">
                            Devoted to perfection in achieving "The Path to Success"
                        </p>
                    </div>
                </div>
            </section>

            {/* Who We Are Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                                Who We Are
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                                StudyAsan - The Path to Success
                            </h2>
                            <div className="space-y-4 text-gray-600 leading-relaxed">
                                <p>
                                    StudyAsan is a 'gesture of studying' devoted to perfection in achieving 'THE PATH TO SUCCESS'.
                                    We are based in Uttarakhand and have speeded up to serve our knowledge in different parts of India.
                                </p>
                                <p>
                                    We have established as an association with a unique spirit to spread knowledge with leaving no
                                    boundaries untouched. We believe our advanced efforts and techno-based education are essential
                                    boosters for a knowledgeable surrounding which can prosper in different fields.
                                </p>
                                <p>
                                    We are engaged in extending the boundaries of knowledge to enhance the qualities and skills
                                    among students of our Country. We provide the best coaching classes for classes 9 and 10,
                                    classes 11 and 12, competitive exams (SSC, Bank, Railway, UPSC, UKSSC, state-level exams),
                                    and computer courses.
                                </p>
                                <p>
                                    We provide potential teachers as affable guides who prepare our students to grab opportunities
                                    in the outside world and become the best of the best.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8">
                                <img
                                    src="/studyasan-logo-lady.png"
                                    alt="StudyAsan Education"
                                    className="w-full max-w-md mx-auto rounded-2xl"
                                />
                            </div>
                            {/* Floating Stats */}
                            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                        <GraduationCap className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">5000+</p>
                                        <p className="text-gray-500">Students Taught</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Evolution Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                                Our Journey
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Evolution</h2>
                        </div>

                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200 hidden md:block"></div>

                            <div className="space-y-8">
                                {/* Timeline Item 1 */}
                                <div className="relative flex gap-8">
                                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center z-10">
                                        <Clock className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 shadow-lg flex-grow">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">The Beginning</h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            Our journey began from Nainital, Uttarakhand during the lockdown with a mission to
                                            provide education to every home in India, delivered by the best and highly devoted teachers.
                                            We believed that education should go beyond academics, and also include other important aspects
                                            such as art, personality development, linguistic command and career counselling.
                                        </p>
                                    </div>
                                </div>

                                {/* Timeline Item 2 */}
                                <div className="relative flex gap-8">
                                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center z-10">
                                        <BookOpen className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 shadow-lg flex-grow">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Expanding Services</h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            In order to achieve our goal, we started offering a variety of courses, including tuition,
                                            moral value and reading classes, basic spoken English and personality development classes,
                                            hobby classes, and competitive exams preparation.
                                        </p>
                                    </div>
                                </div>

                                {/* Timeline Item 3 */}
                                <div className="relative flex gap-8">
                                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center z-10">
                                        <Globe className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 shadow-lg flex-grow">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Pan-India Reach</h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            Over the years, we have grown and expanded and we are committed to connecting mentors
                                            from all over India, regardless of whether they are from villages or cities with students
                                            from diverse places to provide them with the best education and knowledge that they need
                                            to succeed in today's advanced world.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mission & Vision Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Mission */}
                        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-8 text-white">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                <Target className="w-8 h-8 text-cyan-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-6">Our Mission</h3>
                            <ul className="space-y-4">
                                {missionPoints.map((point, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-blue-100 leading-relaxed">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Vision */}
                        <div className="bg-gradient-to-br from-sky-900 to-blue-800 rounded-3xl p-8 text-white">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                <Eye className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-6">Our Vision</h3>
                            <ul className="space-y-4">
                                {visionPoints.map((point, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-blue-100 leading-relaxed">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Pillars Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Our Pillars
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            The Founders
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                            StudyAsan's founders <strong>Deepak Kumar Arya</strong> and <strong>Kadimbini Gahtori</strong> have
                            always believed that "giving brings its own rewards." They believe that teaching is more than just
                            a job, and they have led the institution by spreading the belief that helping people through education
                            is a unifying act.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                                    <Award className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Our Philosophy</h3>
                                    <p className="text-gray-500">The meaning behind StudyAsan</p>
                                </div>
                            </div>

                            <blockquote className="text-xl text-gray-700 italic border-l-4 border-blue-500 pl-6 mb-8">
                                "Studying is an 'asana' of acquiring knowledge through practice"
                            </blockquote>

                            <p className="text-gray-600 leading-relaxed mb-6">
                                The founders have stepped ahead in providing quality education to students across the country.
                                They aim to raise the bar by fulfilling their goal of making education free in India. They have
                                embraced the challenges they faced in acquiring education themselves since childhood, and they
                                are committed to minimizing the education gap in India.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                            Our Values
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            What We Stand For
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {values.map((value, index) => (
                            <div key={index} className="text-center group">
                                <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${value.color} rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg`}>
                                    <value.icon className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                                <p className="text-gray-600">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Be a Part of Our Journey
                    </h2>
                    <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                        Join StudyAsan and take the first step towards achieving your educational goals.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                        >
                            Join as Student
                        </Link>
                        <Link
                            to="/career"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white hover:bg-white/10 transition-colors"
                        >
                            Join as Educator
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
