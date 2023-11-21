import React from "react";
import { Link } from "react-router-dom";
interface Children {
    children: React.ReactNode;
  }
const Layout =({children}:Children) =>{
    return(
        <>
        <div className="py-5 bg-[#030716] border-b-2 border-b-cyan-800">
			<nav className="relative px-4 py-4 flex justify-between items-center">
				<ul className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 flex mx-auto items-center w-auto space-x-6">
					<li><Link className="text-lg text-white hover:text-blue-600" to="/">Home</Link></li>
					<li><Link className="text-lg text-white hover:text-blue-600" to="/feed">Your feed</Link></li>
				</ul>
			</nav>
		</div>

        <main className="py-20 px-10 min-h-screen w-full bg-[#030716] ">{children}</main>
        </>
    )
}

export default Layout;