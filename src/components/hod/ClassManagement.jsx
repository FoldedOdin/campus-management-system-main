import React, { useState, useEffect } from 'react';
import { 
    getClasses, 
    addClass, 
    getFaculties, 
    getSubjectsByClass, 
    addSubject, 
    assignFacultyToSubject, 
    deleteSubject, 
    deleteClass 
} from '../../services/classService';
import HODSidebar from "./HODSidebar";

const ClassManagement = () => {
    // Class state
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({
        name: '',
        dept: '',
        batch_coordinator_id: '',
        batch_year_start: '',
        batch_year_end: ''
    });
    const [showClassModal, setShowClassModal] = useState(false);

    // Subject state
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState('');
    const [subjectError, setSubjectError] = useState('');

    // Faculty state
    const [faculties, setFaculties] = useState([]);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const fetchedClasses = await getClasses();
                const fetchedFaculties = await getFaculties();
                
                if (fetchedFaculties && fetchedFaculties.length > 0) {
                    setFaculties(fetchedFaculties);
                } else {
                    console.warn('No faculties found');
                }
                
                setClasses(fetchedClasses);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch subjects when a class is selected
    useEffect(() => {
        const fetchSubjects = async () => {
            if (selectedClass) {
                const fetchedSubjects = await getSubjectsByClass(selectedClass.id);
                setSubjects(fetchedSubjects);
            }
        };
        fetchSubjects();
    }, [selectedClass]);

    // Handle class creation
    const handleCreateClass = async (e) => {
        e.preventDefault();
        const selectedFaculty = faculties.find(f => f.id === newClass.batch_coordinator_id);
        
        const classData = {
            ...newClass,
            batch_coordinator_name: selectedFaculty ? selectedFaculty.name : ''
        };

        const createdClass = await addClass(classData);
        if (createdClass) {
            setClasses([...classes, createdClass]);
            setNewClass({
                name: '',
                dept: '',
                batch_coordinator_id: '',
                batch_year_start: '',
                batch_year_end: ''
            });
            setShowClassModal(false);
        }
    };

    // Handle subject creation
    const handleAddSubject = async (e) => {
        e.preventDefault();
        // Clear previous error
        setSubjectError('');
        
        if (!selectedClass) {
            alert('Please select a class first');
            return;
        }

        // Validate subject name
        if (!newSubject.trim()) {
            setSubjectError('Subject name cannot be empty');
            return;
        }

        const subjectData = {
            name: newSubject.trim(),
            class_id: selectedClass.id
        };

        const createdSubject = await addSubject(subjectData);
        if (createdSubject) {
            setSubjects([...subjects, createdSubject]);
            setNewSubject('');
        }
    };

    // Handle faculty assignment to subject
    const handleAssignFaculty = async (subjectId, facultyId) => {
        const updatedSubject = await assignFacultyToSubject(subjectId, facultyId);
        if (updatedSubject) {
            // Update the subjects array with the new data
            const updatedSubjects = subjects.map(subject => 
                subject.id === updatedSubject.id ? updatedSubject : subject
            );
            setSubjects(updatedSubjects);
        }
    };

    // Handle subject deletion
    const handleDeleteSubject = async (subjectId) => {
        const isDeleted = await deleteSubject(subjectId);
        if (isDeleted) {
            const filteredSubjects = subjects.filter(subject => subject.id !== subjectId);
            setSubjects(filteredSubjects);
        }
    };

    // Handle class deletion
    const handleDeleteClass = async (classId) => {
        const isDeleted = await deleteClass(classId);
        if (isDeleted) {
            const filteredClasses = classes.filter(cls => cls.id !== classId);
            setClasses(filteredClasses);
            setSelectedClass(null);
            setSubjects([]);
        }
    };

    // Get available faculties (excluding those already assigned as coordinators)
    const getAvailableFaculties = () => {
        const coordinatorIds = classes.map(cls => cls.batch_coordinator_id);
        return faculties.filter(faculty => !coordinatorIds.includes(faculty.id));
    };

    // Get subjects count for a class
    const getSubjectsCount = (classId) => {
        return subjects.filter(subject => subject.class_id === classId).length;
    };

    return (
        <div className="flex">
            <div className="static"><HODSidebar /></div>
            
            <div className="container mx-auto p-6 flex-1">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Class Management</h1>
                    <button 
                        onClick={() => setShowClassModal(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Create New Class
                    </button>
                </div>

                {/* Class Creation Modal */}
                {showClassModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Create New Class</h2>
                                <button 
                                    onClick={() => setShowClassModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleCreateClass} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Class Name"
                                    value={newClass.name}
                                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Department"
                                    value={newClass.dept}
                                    onChange={(e) => setNewClass({...newClass, dept: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                                <select
                                    value={newClass.batch_coordinator_id || ''}
                                    onChange={(e) => setNewClass({...newClass, batch_coordinator_id: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">Select Batch Coordinator</option>
                                    {getAvailableFaculties().map((faculty) => (
                                        <option key={faculty.id} value={faculty.id}>
                                            {faculty.name} ({faculty.dept})
                                        </option>
                                    ))}
                                </select>
                                <div className="flex space-x-4">
                                    <input
                                        type="number"
                                        placeholder="Batch Start Year"
                                        value={newClass.batch_year_start}
                                        onChange={(e) => setNewClass({...newClass, batch_year_start: e.target.value})}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Batch End Year"
                                        value={newClass.batch_year_end}
                                        onChange={(e) => setNewClass({...newClass, batch_year_end: e.target.value})}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowClassModal(false)}
                                        className="px-4 py-2 border rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {/* Class and Subject Management Section */}
                    <div className="bg-white text-black shadow-md rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">Manage Classes and Subjects</h2>
                        
                        {/* Class Selection */}
                        <div className="mb-4">
                            <select
                                value={selectedClass?.id || ''}
                                onChange={(e) => {
                                    const cls = classes.find(c => c.id === e.target.value);
                                    setSelectedClass(cls);
                                    // Clear subject error when changing class
                                    setSubjectError('');
                                }}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">Select a Class to Manage</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} ({cls.dept}) - {cls.batch_year_start} to {cls.batch_year_end}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Current Class Information */}
                        {selectedClass && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Current Class Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-600">Class Name:</p>
                                        <p className="font-medium">{selectedClass.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Department:</p>
                                        <p className="font-medium">{selectedClass.dept}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Batch Years:</p>
                                        <p className="font-medium">{selectedClass.batch_year_start} - {selectedClass.batch_year_end}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Batch Coordinator:</p>
                                        <p className="font-medium">{selectedClass.batch_coordinator_name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Current Assigned Subjects Summary */}
                        {selectedClass && subjects.length > 0 && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Current Assigned Subjects Summary</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {subjects.map((subject) => (
                                        <div key={subject.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                            <h4 className="font-medium">{subject.name}</h4>
                                            <p className="text-sm text-gray-500">
                                                {subject.faculty ? 
                                                    `Faculty: ${subject.faculty.name} (${subject.faculty.dept})` : 
                                                    'No faculty assigned'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subject Management */}
                        {selectedClass && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold">
                                        Subjects for {selectedClass.name}
                                    </h3>
                                    <div className="flex flex-col">
                                        <div className="flex">
                                            <input
                                                type="text"
                                                placeholder="New Subject Name"
                                                value={newSubject}
                                                onChange={(e) => {
                                                    setNewSubject(e.target.value);
                                                    if (e.target.value.trim()) {
                                                        setSubjectError('');
                                                    }
                                                }}
                                                className={`p-2 border rounded-l ${subjectError ? 'border-red-500' : ''}`}
                                            />
                                            <button 
                                                onClick={handleAddSubject}
                                                className="bg-green-500 text-white p-2 rounded-r hover:bg-green-600"
                                            >
                                                Add Subject
                                            </button>
                                        </div>
                                        {subjectError && (
                                            <p className="text-red-500 text-sm mt-1">{subjectError}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Current Subjects */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-medium mb-2">Current Subjects ({subjects.length})</h4>
                                    {subjects.length === 0 ? (
                                        <p className="text-gray-500">No subjects added yet</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="border p-2 text-left">Subject</th>
                                                        <th className="border p-2 text-left">Assigned Faculty</th>
                                                        <th className="border p-2 text-left">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjects.map((subject) => (
                                                        <tr key={subject.id} className="border hover:bg-gray-50">
                                                            <td className="border p-2">{subject.name}</td>
                                                            <td className="border p-2">
                                                                {subject.faculty ? (
                                                                    <span>
                                                                        {subject.faculty.name} ({subject.faculty.dept})
                                                                    </span>
                                                                ) : (
                                                                    <select
                                                                        value={subject.faculty_id || ''}
                                                                        onChange={(e) => handleAssignFaculty(subject.id, e.target.value)}
                                                                        className="w-full p-1 border rounded"
                                                                    >
                                                                        <option value="">Select Faculty</option>
                                                                        {faculties.map((faculty) => (
                                                                            <option key={faculty.id} value={faculty.id}>
                                                                                {faculty.name} ({faculty.dept})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="border p-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`Are you sure you want to delete ${subject.name}?`)) {
                                                                            handleDeleteSubject(subject.id);
                                                                        }
                                                                    }}
                                                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Class Button */}
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete ${selectedClass.name} and all its subjects?`)) {
                                            handleDeleteClass(selectedClass.id);
                                        }
                                    }}
                                    className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                >
                                    Delete This Class
                                </button>
                            </div>
                        )}
                    </div>

                    {/* All Classes List */}
                    <div className="bg-white text-black shadow-md rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">All Classes</h2>
                        {classes.length === 0 ? (
                            <p className="text-gray-500">No classes created yet</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">Class Name</th>
                                            <th className="border p-2 text-left">Department</th>
                                            <th className="border p-2 text-left">Batch Years</th>
                                            <th className="border p-2 text-left">Batch Coordinator</th>
                                            <th className="border p-2 text-left">Subjects</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((cls) => (
                                            <tr 
                                                key={cls.id} 
                                                className={`border hover:bg-gray-50 ${selectedClass?.id === cls.id ? 'bg-blue-50' : ''}`}
                                                onClick={() => setSelectedClass(cls)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="border p-2">{cls.name}</td>
                                                <td className="border p-2">{cls.dept}</td>
                                                <td className="border p-2">{cls.batch_year_start} - {cls.batch_year_end}</td>
                                                <td className="border p-2">{cls.batch_coordinator_name}</td>
                                                <td className="border p-2">
                                                    {cls.id === selectedClass?.id ? 
                                                        subjects.length : 
                                                        getSubjectsCount(cls.id)} subjects
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassManagement;