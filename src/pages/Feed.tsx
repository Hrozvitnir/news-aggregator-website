import { FormEvent, useState, useEffect, useRef } from "react";
import useCookies from "react-cookie/es6/useCookies";
import env from "react-dotenv";

interface SearchElements extends HTMLFormControlsCollection{
    sources: HTMLSelectElement;
    categories: HTMLSelectElement;
    authors:HTMLSelectElement;
}
interface SearchForm extends HTMLFormElement{
    readonly elements: SearchElements;
}

interface IArticle {
    author?: string,
    content?: string,
    description?: string,
    publishedAt: string,
    source:{
        id: string,
        name: string,
    },
    title: string,
    url: string,
    urlToImage?: string,

}
const Feed = () => {

    //categories
    const newsCategories = [
        'all categories',
        'general',
        'business',
        'entertainment',
        'health',
        'science',
        'sports',
        'technology',
        'politics',  
        'environment', 
        'world',  
        'nyregion',  
        'arts',  
        'fashion',  
        'travel',  
        'education',  
        'opinion',  
        'books',  
        'food',  
        'science',  
        'magazine',  
        'automobiles',  
      ];
      const newsSources = [
        "All sources",
        "The Guardian",
        "New York Times",
        "NewsApi.org",
      ]

    const [articles, setArticles] = useState<Array<IArticle>>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [currentQuery, setCurrentQuery] = useState<string>("");
    const [source, setSource] = useState<string>("");
    const [category, setCategory] = useState<String>("");
    const [totalPages, setTotalPages] = useState<number>(0);
    const [currentSource, setCurrentSource] = useState<string>("All sources");
    const [cookies, setCookie] = useCookies(['authorsNYT', 'authorsTG', 'authorsNewsApi', 'source', 'category', 'author']);
    const [noArticlesFound, setNoArticlesFound] = useState<boolean>(false);
    const preventRerender = useRef(false);
    let allAuthors:string[] = [];
    try{
        if(cookies.authorsNYT.length > 1){
            allAuthors = [...allAuthors,...cookies.authorsNYT.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0,-1)];
        }
        if(cookies.authorsNewsApi.length > 1){
            allAuthors = [...allAuthors, ...cookies.authorsNewsApi.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0,-1)];
        }
        if(cookies.authorsTG){
            allAuthors = [...allAuthors, ...cookies.authorsTG.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0,-1)];
        }
        if(allAuthors.length < 1){
        alert('You need to add some authors to favourite list first.');
        window.location.href = '/';
        }
    } catch(e){}
    const onSubmit = async (event:FormEvent<SearchForm>) => {
        event.preventDefault();
        setArticles([]);
        const target = event.currentTarget.elements;
        const data = {
            sources: target.sources.value,
            categories: target.categories.value,
            authors: target.authors.value,
        }

        setCookie('source', data.sources);
        setCookie('category', data.categories);
        setCookie('author', data.authors);

        setLoading(true);
        let articlesTemp:IArticle[] = []; 

        //Add a delay of 75 seconds before fetching the articles because of request rate from API Data sources
        await new Promise(resolve => setTimeout(resolve, 75000)); 
        const pullArticles = async () => {
                //NewsApi.org
            if(data.sources === newsSources[0] || data.sources === newsSources[3] ){
                const newsApiUrl = `https://newsapi.org/v2/everything?q=${data.categories}
                        &language=en&pageSize=10&apiKey=${env.NEWS_API_KEY}`;

                const makeRequestForArticles = async (page:number) => {
                    const newsApiUrlPage = `https://newsapi.org/v2/everything?q=${data.categories}
                    &language=en&page=${page}&pageSize=10&apiKey=${env.NEWS_API_KEY}`;
                
                    try {
                    const res = await fetch(newsApiUrlPage, { mode: 'cors' });
                    const data = await res.json();
                    return data.articles;
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes');
                    return [];
                    }
                };
    
                const fetchArticlesForAllPages = async () => {
                    
                    try {
                    //Add a delay of 5 seconds before fetching the articles because of request rate from API Data sources
                    await new Promise(resolve => setTimeout(resolve, 5000)); 
                    const res = await fetch(newsApiUrl, { mode: 'cors' });
                    const resData = await res.json();
                
                    let articlesFromData = resData.articles;
                    const pagesTotal = Math.min(Math.ceil(resData.totalResults / 12), 5);
                
                    const promises = [];
                
                    for (let page = 2; page <= pagesTotal; page++) {
                        promises.push(makeRequestForArticles(page));
                    }
                
                    const results = await Promise.all(promises);
                
                    results.forEach((articles) => {
                        articlesFromData = [...articlesFromData, ...articles];
                    });
                
                    articlesTemp = [...articlesTemp, ...articlesFromData];
                    
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes');
                        
                    }
                };
    
            await fetchArticlesForAllPages();
            }

            //The Guardian Api
            if(data.sources === newsSources[0] || data.sources === newsSources[1]){
                const guardianApiUrl = `https://content.guardianapis.com/search?tags=${data.categories}&show-tags=contributor&show-fields=thumbnail&format=json&api-key=${env.GUARDIAN_API_KEY}`;
                
                const addGuardianNewsToList = (data:any[]) => {
                    let articlesFromData:IArticle[] = [];
                    
                    for(const article of data) {
                        let articleObj:IArticle = {
                            title: String(article.webTitle),
                            publishedAt: String(article.webPublicationDate),
                            source: {
                                id: "the-guardian",
                                name: "The Guardian"
                            },
                            url: String(article.webUrl),
                            urlToImage: String(article.fields?.thumbnail),
                            author: String(article.tags[0]?.webTitle)
                        }
                        articlesFromData.push(articleObj);
                    }
                    return articlesFromData;
                }

                const guardianMakeRequestForArticles = async (page:number) => {
                    const guardianApiUrlPage =`https://content.guardianapis.com/search?tags=${data.categories}&page=${page}&show-fields=thumbnail&format=json&api-key=${env.GUARDIAN_API_KEY}`;
                
                    try {
                    const res = await fetch(guardianApiUrlPage, { mode: 'cors' });
                    const data = await res.json();
                 
                    let articles = addGuardianNewsToList(data.response.results);
                    return articles;
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes');
                    return [];
                    }
                };

                

                const fetchArticlesForAllPages = async () => {
                    
                
                    try {
                    //Add a delay of 20 seconds before fetching the articles because of request rate from API Data sources
                    await new Promise(resolve => setTimeout(resolve, 5000)); 
                    //get first page
                    const res = await fetch(guardianApiUrl, { mode: 'cors' });
                    const resData = await res.json();
                    
                    let articlesFromData = addGuardianNewsToList(resData.response.results);

                    const pagesTotal = Math.min(Math.ceil(resData.response.total / 10 ), 5);
                
                    const promises = [];
                    //get the last 4 pages as well
                    for (let page = 2; page <= pagesTotal; page++) {
                        
                        promises.push(guardianMakeRequestForArticles(page));
                    }
                
                    const results = await Promise.all(promises);
                
                    results.forEach((articles) => {
                        articlesFromData = [...articlesFromData, ...articles];
                    });
                    articlesTemp = [...articlesTemp, ...articlesFromData];
                    
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes');
                    }
                };
    
            await fetchArticlesForAllPages();
            }
            
            //NYT API
            if(data.sources === newsSources[0] || data.sources === newsSources[2]){

                const nytApiUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${data.categories}&page=0&sort=relevance&api-key=${env.NYT_API_KEY}`;
                
                const addNYTNewsToList = (data:any[]) => {
                    let articlesFromData:IArticle[] = [];
                    
                    for(const article of data) {
                        let articleObj:IArticle = {
                            title: String(article?.headline.main),
                            publishedAt: String(article?.pub_date),
                            source: {
                                id: "nyt",
                                name: "New York Times"
                            },
                            url: String(article?.web_url),
                            urlToImage: String(`https://static01.nyt.com/${article?.multimedia[0]?.url}`),
                            author: String(article?.byline.original)
                        }
                        articlesFromData.push(articleObj);
                    }

                    if(articlesFromData.length < 1 ){
                        alert('Api rate exceeded - try again in 5 minutes');
                    }
                    return articlesFromData;
                }

                const nytMakeRequestForArticles = async (page:number) => {
                    const nytApiUrlPage =`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${data.categories}&page=${page}&sort=relevance&api-key=${env.NYT_API_KEY}`;
                       
                    try {
                    const res = await fetch(nytApiUrlPage, { mode: 'cors' });
                    const data = await res.json();
                    
                    let articles = addNYTNewsToList(data.response.docs);

                    return articles;
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes - '+ error);
                    return [];
                    }
                };
                const fetchArticlesForAllPages = async () => {
                    
                
                    try {
                    await new Promise(resolve => setTimeout(resolve, 12000)); 
                    //get first page
                    const res = await fetch(nytApiUrl, { mode: 'cors' });
                    const resData = await res.json();
                  
                    let articlesFromData = addNYTNewsToList(resData.response.docs);
                    
                    const pagesTotal = Math.min(Math.ceil(resData.response.meta.hits / 10 ), 4); //max 5 pages because 5 requests/min policy, NYT articles start at page 0
                
                    const promises = [];
                    //get the last pages as well
                    for (let page = 1; page <= pagesTotal; page++) {
                        promises.push(nytMakeRequestForArticles(page));
                    }
                
                    const results = await Promise.all(promises);
                
                    results.forEach((articles) => {
                        articlesFromData = [...articlesFromData, ...articles];
                    });
                    
                
                    articlesTemp = [...articlesTemp, ...articlesFromData];
                    
                    } catch (error) {
                        alert('Api rate exceeded - try again in 5 minutes');
                    }
                }
            await fetchArticlesForAllPages();
            }
            // filter based on authors
            if (data.authors !== "all authors") {
                articlesTemp = articlesTemp.filter(article => article.author === data.authors);
            }
            if(articlesTemp.length < 1){
                setNoArticlesFound(true);
                setLoading(false);
            } else {
                setArticles(articlesTemp);
                setTotalPages(articlesTemp.length / 10);
                setNoArticlesFound(false);
                setLoading(false);
            } 
        }
        
        await pullArticles();
    }
    const addAuthorToFavourites = (author:string, source:string) => {

        const checkInAuthorsList = (author:string, cookieOfAuthors:string):boolean => {
            if(cookieOfAuthors && cookieOfAuthors.length > 1){
                let authorsArray = cookieOfAuthors.trim().split(',').map(name => name.replace(/^"|"$/g, ''));
                console.log(authorsArray);
                authorsArray = authorsArray
                .filter(name => name.trim() !== 'undefined')
                .filter((name, index, self) => self.indexOf(name) === index);
                //console.log(authorsArray.includes(author));
                return authorsArray.includes(author);
            }
            return false;
        }
        if(source === "New York Times" || source === "The Guardian"){
            if(source === "New York Times"){
                const authorsPrev = cookies.authorsNYT;
                if(!checkInAuthorsList(author, JSON.stringify(authorsPrev))){
                    setCookie('authorsNYT', authorsPrev ? `${authorsPrev}${author},` : `${author},`);
                } else {
                    alert("This author is already in your favourites list!");
                }
                
            }
            if(source === "The Guardian"){
                const authorsPrev = cookies.authorsTG;
                if(!checkInAuthorsList(author, JSON.stringify(authorsPrev))){
                    setCookie('authorsTG', authorsPrev ? `${authorsPrev}${author},` : `${author},`);
                }
                else {
                    alert("This author is already in your favourites list!");
                }
            }
        } else {
            const authorsPrev = cookies.authorsNewsApi;
            if(!checkInAuthorsList(author, JSON.stringify(authorsPrev))){
                setCookie('authorsNewsApi', authorsPrev ? `${authorsPrev}${author},` : `${author},`);
            } else {
                alert("This author is already in your favourites list!");
            }
        }
      
    }
    useEffect(()=>{
        if(!preventRerender.current){
            preventRerender.current = true;
            if(cookies.author && cookies.category && cookies.source){
                const fetchArticles = async () => {
                setArticles([]);
                
                const data = {
                    sources: cookies.source,
                    categories: cookies.category,
                    authors: cookies.author,
                }

                setLoading(true);
                let articlesTemp:IArticle[] = []; 

                //Add a delay of 75 seconds before fetching the articles because of request rate from API Data sources
                await new Promise(resolve => setTimeout(resolve, 75000)); 
                const pullArticles = async () => {
                        //NewsApi.org
                    if(data.sources === newsSources[0] || data.sources === newsSources[3] ){
                        const newsApiUrl = `https://newsapi.org/v2/everything?q=${data.categories}
                                &language=en&pageSize=10&apiKey=${env.NEWS_API_KEY}`;

                        const makeRequestForArticles = async (page:number) => {
                            const newsApiUrlPage = `https://newsapi.org/v2/everything?q=${data.categories}
                            &language=en&page=${page}&pageSize=10&apiKey=${env.NEWS_API_KEY}`;
                        
                            try {
                            const res = await fetch(newsApiUrlPage, { mode: 'cors' });
                            const data = await res.json();
                            return data.articles;
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes');
                            return [];
                            }
                        };
            
                        const fetchArticlesForAllPages = async () => {
                            
                            try {
                            //Add a delay of 5 seconds before fetching the articles because of request rate from API Data sources
                            await new Promise(resolve => setTimeout(resolve, 5000)); 
                            const res = await fetch(newsApiUrl, { mode: 'cors' });
                            const resData = await res.json();
                        
                            let articlesFromData = resData.articles;
                            const pagesTotal = Math.min(Math.ceil(resData.totalResults / 12), 5);
                        
                            const promises = [];
                        
                            for (let page = 2; page <= pagesTotal; page++) {
                                promises.push(makeRequestForArticles(page));
                            }
                        
                            const results = await Promise.all(promises);
                        
                            results.forEach((articles) => {
                                articlesFromData = [...articlesFromData, ...articles];
                            });
                        
                            articlesTemp = [...articlesTemp, ...articlesFromData];
                            
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes');
                                
                            }
                        };
            
                    await fetchArticlesForAllPages();
                    }

                    //The Guardian Api
                    if(data.sources === newsSources[0] || data.sources === newsSources[1]){
                        const guardianApiUrl = `https://content.guardianapis.com/search?tags=${data.categories}&show-tags=contributor&show-fields=thumbnail&format=json&api-key=${env.GUARDIAN_API_KEY}`;
                        
                        const addGuardianNewsToList = (data:any[]) => {
                            let articlesFromData:IArticle[] = [];
                            
                            for(const article of data) {
                                let articleObj:IArticle = {
                                    title: String(article.webTitle),
                                    publishedAt: String(article.webPublicationDate),
                                    source: {
                                        id: "the-guardian",
                                        name: "The Guardian"
                                    },
                                    url: String(article.webUrl),
                                    urlToImage: String(article.fields?.thumbnail),
                                    author: String(article.tags[0]?.webTitle)
                                }
                                articlesFromData.push(articleObj);
                            }
                            return articlesFromData;
                        }

                        const guardianMakeRequestForArticles = async (page:number) => {
                            const guardianApiUrlPage =`https://content.guardianapis.com/search?tags=${data.categories}&page=${page}&show-fields=thumbnail&format=json&api-key=${env.GUARDIAN_API_KEY}`;
                        
                            try {
                            const res = await fetch(guardianApiUrlPage, { mode: 'cors' });
                            const data = await res.json();
                        
                            let articles = addGuardianNewsToList(data.response.results);
                            return articles;
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes');
                            return [];
                            }
                        };

                        

                        const fetchArticlesForAllPages = async () => {
                            
                        
                            try {
                            //Add a delay of 20 seconds before fetching the articles because of request rate from API Data sources
                            await new Promise(resolve => setTimeout(resolve, 5000)); 
                            //get first page
                            const res = await fetch(guardianApiUrl, { mode: 'cors' });
                            const resData = await res.json();
                            
                            let articlesFromData = addGuardianNewsToList(resData.response.results);

                            const pagesTotal = Math.min(Math.ceil(resData.response.total / 10 ), 5);
                        
                            const promises = [];
                            //get the last 4 pages as well
                            for (let page = 2; page <= pagesTotal; page++) {
                                
                                promises.push(guardianMakeRequestForArticles(page));
                            }
                        
                            const results = await Promise.all(promises);
                        
                            results.forEach((articles) => {
                                articlesFromData = [...articlesFromData, ...articles];
                            });
                            articlesTemp = [...articlesTemp, ...articlesFromData];
                            
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes');
                            }
                        };
            
                    await fetchArticlesForAllPages();
                    }
                    
                    //NYT API
                    if(data.sources === newsSources[0] || data.sources === newsSources[2]){

                        const nytApiUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${data.categories}&page=0&sort=relevance&api-key=${env.NYT_API_KEY}`;
                        
                        const addNYTNewsToList = (data:any[]) => {
                            let articlesFromData:IArticle[] = [];
                            
                            for(const article of data) {
                                let articleObj:IArticle = {
                                    title: String(article?.headline.main),
                                    publishedAt: String(article?.pub_date),
                                    source: {
                                        id: "nyt",
                                        name: "New York Times"
                                    },
                                    url: String(article?.web_url),
                                    urlToImage: String(`https://static01.nyt.com/${article?.multimedia[0]?.url}`),
                                    author: String(article?.byline.original)
                                }
                                articlesFromData.push(articleObj);
                            }

                            if(articlesFromData.length < 1 ){
                                alert('Api rate exceeded - try again in 5 minutes');
                            }
                            return articlesFromData;
                        }

                        const nytMakeRequestForArticles = async (page:number) => {
                            const nytApiUrlPage =`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${data.categories}&page=${page}&sort=relevance&api-key=${env.NYT_API_KEY}`;
                            
                            try {
                            const res = await fetch(nytApiUrlPage, { mode: 'cors' });
                            const data = await res.json();
                            
                            let articles = addNYTNewsToList(data.response.docs);

                            return articles;
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes - '+ error);
                            return [];
                            }
                        };
                        const fetchArticlesForAllPages = async () => {
                            
                        
                            try {
                            await new Promise(resolve => setTimeout(resolve, 12000)); 
                            //get first page
                            const res = await fetch(nytApiUrl, { mode: 'cors' });
                            const resData = await res.json();
                        
                            let articlesFromData = addNYTNewsToList(resData.response.docs);
                            
                            const pagesTotal = Math.min(Math.ceil(resData.response.meta.hits / 10 ), 4); //max 5 pages because 5 requests/min policy, NYT articles start at page 0
                        
                            const promises = [];
                            //get the last pages as well
                            for (let page = 1; page <= pagesTotal; page++) {
                                promises.push(nytMakeRequestForArticles(page));
                            }
                        
                            const results = await Promise.all(promises);
                        
                            results.forEach((articles) => {
                                articlesFromData = [...articlesFromData, ...articles];
                            });
                            
                        
                            articlesTemp = [...articlesTemp, ...articlesFromData];
                            
                            } catch (error) {
                                alert('Api rate exceeded - try again in 5 minutes');
                            }
                        }
                    await fetchArticlesForAllPages();
                    }
                    // filter based on authors
                    if (data.authors !== "all authors") {
                        articlesTemp = articlesTemp.filter(article => article.author === data.authors);
                    }
                    if(articlesTemp.length < 1){
                        setNoArticlesFound(true);
                        setLoading(false);
                    } else {
                        setArticles(articlesTemp);
                        setTotalPages(articlesTemp.length / 10);
                        setNoArticlesFound(false);
                        setLoading(false);
                    } 
                }
                
                await pullArticles();
                setLoading(false);
                }
                    fetchArticles();
            }
        }
    },[])

    return(
        <div className="w-full flex flex-col gap-y-5 justify-center text-center">
            <h1 className="text-4xl text-white underline-offset-8 underline">Search news</h1>
            <form onSubmit={onSubmit} className="flex flex-row flex-wrap gap-y-4 gap-x-5 w-full justify-center">
            <select name="sources" value={currentSource} className="bg-slate-600 rounded-md py-3 px-3 border-2 text-white border-cyan-800 focus:outline-none" onChange={(e) => {setCurrentSource(e.currentTarget.value)}}>
                {
                    newsSources.map((source:string) => {
                        return <option key={(Math.random() + 1).toString(36).substring(7) + newsCategories.indexOf(source)+1} value={source}>{source}</option>
                    })
                }
            </select>
            
                <>
            <select name="categories" defaultValue="all categories" className="bg-slate-600 rounded-md py-3 px-3 border-2 text-white border-cyan-800 focus:outline-none">
                
                
                {
                    newsCategories.map((category:string) => {
                        return <option key={(Math.random() + 1).toString(32).substring(7) + newsCategories.indexOf(category)+1} value={category}>{category[0].toUpperCase()+category.slice(1)}</option>
                    })
                }
            </select>
            <select name="authors" defaultValue="" className="bg-slate-600 rounded-md py-3 px-3 border-2 text-white border-cyan-800 focus:outline-none">
                <option value="all authors">All authors</option>
               { currentSource === "All sources" &&
                    allAuthors.map((author:string) => {
                        console.log(author);
                        return <option key={(Math.random() + 1).toString(33).substring(7)} value={author}>{author}</option>
                        }
                    )
               }
                { currentSource !== "" && currentSource === "The Guardian" && cookies.authorsTG &&
                    cookies.authorsTG.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0, -1).map((authorTG:string) => {
                        return <option key={(Math.random() + 1).toString(34).substring(7)} value={authorTG}>{authorTG}</option>
                        }
                    )
               }
               { currentSource !== "" && currentSource === "New York Times" && cookies.authorsNYT &&
                    cookies.authorsNYT.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0,-1).map((authorsNYT:string) => {
                        return <option key={(Math.random() + 1).toString(35).substring(7)} value={authorsNYT}>{authorsNYT}</option>
                        }
                    )
               }
               { currentSource !== "" && currentSource === "NewsApi.org" && cookies.authorsNewsApi &&
                    cookies.authorsNewsApi.trim().split(',').map((name: string) => name.replace(/^"|"$/g, '')).slice(0, -1).map((authorNewsApi:string) => {
                        return <option key={(Math.random() + 1).toString(34).substring(7)} value={authorNewsApi}>{authorNewsApi}</option>
                        }
                    )
               }
            </select>

            <button type="submit" className="px-3 py-3 bg-green-800 text-white rounded-md">Set feed</button>
            </>
            
            </form>
            
            {loading === true &&
            <div className="flex flex-col justify-center items-center w-full">
                 <div role="status">
                     <svg aria-hidden="true" className="w-12 h-12 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
                     
                 </div>
                 <span className="text-2xl text-white">Fetching news...<br/>This might take up to two minutes due to API request limits.<br />Please do not close the window!</span>
             </div>
            }
            {loading === false && noArticlesFound === true &&
                    <div className="flex justify-center items-center w-full">
                   
                    <span className="text-2xl text-white">Couldn't find any news with the provided parameters.</span>
                </div>              
            }
            {loading === false && articles.length > 1 &&
                <>
                <div className="flex flex-row justify-center flex-wrap gap-x-10 gap-y-20">
                    {articles.map((article) => { 
                        if(articles.indexOf(article) <= (page * 10) -1){
                        return (
                        <div key={articles.indexOf(article)} className="flex flex-col align-top text-center w-72 max-h-96 gap-y-3">
                            <img src={article?.urlToImage} alt="" className="object-cover bg-no-repeat bg-center w-72 h-44"/>
                            <p className="text-sm text-white">{article?.title}</p>
                            <p className="text-sm text-white">{article?.publishedAt.substring(0, 10)}</p>
                            <p className="text-sm text-white">{article?.source.name}</p>
                            {article?.author && article.author !== null && article.author !== "null" && article.author !== "[Removed]" && article.author !== "undefined" &&
                                <div className="flex flex-row gap-x-3 items-center"> 
                                <p className="text-sm text-white">{article.author}</p>
                                <button className="px-3 py-3 bg-green-700 rounded-lg text-sm text-white" onClick={(e) => {addAuthorToFavourites(article.author as string, article?.source.name! as string); e.currentTarget.style.display = "none"; console.log(cookies.authorsTG, cookies.authorsNewsApi, cookies.authorsNYT)}}>Add author to favourites</button>
                                </div> 
                            }
                        </div>);
                        }
                    })}
                    
                </div>
                <div className="flex flex-row gap-x-5 w-full justify-around">
                    { page < totalPages &&
                     <button className="py-5 px-3 text-white text-3xl bg-slate-700" onClick={() => {setPage(page + 1)}}>Load more</button>
                    }
                </div>
                </>
            }
            
        </div>
    );
}

export default Feed;