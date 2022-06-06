import { Link } from 'react-router-dom';
function Header() {
    return (
    <div className="">
        <ul className="list-none overflow-hidden m-0 p-0 block bg-sky-900">
            {[['Home', '/'], ['About', '/about']]
            .map(([title, url]) => (
                <li className="float-left text-white hover:bg-blue-300 p-3" key={title}>
                <Link to={url}> {title} </Link>
                </li>
            ))}
        </ul>
    </div>
    )
}

export default Header;