export interface ContactDepartment {
  id: string;
  data: { title: string; intro?: string; order?: number };
}

export interface ContactPerson {
  id: string;
  data: {
    title: string;
    department: string | { id: string };
    visible?: boolean;
    role?: string;
    departmentHead?: boolean;
    phone?: string;
    email?: string;
    order?: number;
  };
}

const ordered = (a: { id: string; data: { order?: number; title: string } }, b: typeof a) =>
  (a.data.order ?? Infinity) - (b.data.order ?? Infinity)
  || a.data.title.localeCompare(b.data.title, 'cs')
  || a.id.localeCompare(b.id, 'cs');

/** Resolve the directory for the contact page; archiving never deletes a person. */
export function contactGroups(departments: ContactDepartment[], people: ContactPerson[]) {
  return [...departments].sort(ordered).map(({ id, data }) => ({
    title: data.title,
    intro: data.intro,
    people: people
      .filter(({ data: person }) => person.visible !== false &&
        (typeof person.department === 'string' ? person.department : person.department.id) === id)
      .sort((a, b) => Number(b.data.departmentHead === true) - Number(a.data.departmentHead === true) || ordered(a, b))
      .map(({ data: person }) => ({
        name: person.title,
        role: person.role,
        phone: person.phone,
        email: person.email,
        order: person.order,
        departmentHead: person.departmentHead === true,
      })),
  })).filter(group => group.people.length || group.intro);
}
